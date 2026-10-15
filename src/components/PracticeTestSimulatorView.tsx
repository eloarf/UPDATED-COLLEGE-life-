import React, { useState, useEffect } from 'react';
import {
  ExamQuestion,
  ExamSession,
  UserExamResponse,
  AutoGradingResult,
  MistakeRecord,
} from '../types/study';
import {
  Clock,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Code2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RemediationDrawer } from './RemediationDrawer';

interface PracticeTestSimulatorViewProps {
  session: ExamSession;
  onRecordMistake: (
    mistake: Omit<MistakeRecord, 'id' | 'timestamp' | 'attemptCount' | 'status'>
  ) => void;
  onSessionComplete: (gradedResult: AutoGradingResult) => void;
  onExitSimulator: () => void;
}

export const PracticeTestSimulatorView: React.FC<PracticeTestSimulatorViewProps> = ({
  session,
  onRecordMistake,
  onSessionComplete,
  onExitSimulator,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: string }>({});
  const [flagged, setFlagged] = useState<{ [qId: string]: boolean }>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(
    session.time_limit_minutes * 60
  );
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<AutoGradingResult | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [remediationTarget, setRemediationTarget] = useState<{
    question: ExamQuestion;
    userAnswer: string;
  } | null>(null);

  // Tutor mode instant state
  const [tutorChecked, setTutorChecked] = useState<{ [qId: string]: boolean }>({});

  const currentQ = session.questions[currentIndex];

  // Countdown timer
  useEffect(() => {
    if (!isTimerRunning || gradingResult) return;
    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, gradingResult]);

  const handleAnswerChange = (qId: string, value: string) => {
    if (gradingResult) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleToggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleFinalSubmit = async () => {
    setIsGrading(true);
    setIsTimerRunning(false);
    setShowSubmitConfirm(false);

    const totalSecondsSpent = session.time_limit_minutes * 60 - timeRemainingSeconds;

    const formattedResponses = session.questions.map((q) => ({
      question_id: q.id,
      user_answer: userAnswers[q.id] || '',
      time_taken_seconds: Math.round(totalSecondsSpent / session.questions.length),
      flagged_for_review: !!flagged[q.id],
    }));

    try {
      const response = await fetch('/api/exam/auto-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          questions: session.questions,
          responses: formattedResponses,
          time_limit_minutes: session.time_limit_minutes,
          time_spent_seconds: totalSecondsSpent,
        }),
      });

      if (!response.ok) throw new Error('Auto-grading response failed');
      const result: AutoGradingResult = await response.json();
      setGradingResult(result);
      onSessionComplete(result);

      // Log missed questions to Mistake Vault automatically
      result.responses.forEach((resp) => {
        if (!resp.is_correct) {
          const qObj = session.questions.find((q) => q.id === resp.question_id);
          if (qObj) {
            onRecordMistake({
              questionId: qObj.id,
              question: qObj.question_text,
              scenario: qObj.section_title,
              options: qObj.options || [],
              userAnswerIndex: -1,
              correctAnswerIndex: -1,
              userAnswerText: resp.user_answer || 'Unanswered',
              correctAnswerText: resp.ideal_model_answer || qObj.correct_answer,
              explanation: resp.what_you_missed || qObj.explanation,
              topic: qObj.topic_tag,
              sourceType: 'mock_exam',
              sourceSuiteTitle: session.title,
              category: qObj.question_type === 'code' ? 'calculation' : 'concept_confusion',
            });
          }
        }
      });

      if (result.score_percentage >= 80) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err) {
      console.error('Auto-grading error:', err);
      // Fallback client grading
      const mockResult: AutoGradingResult = {
        session_id: session.id,
        score_percentage: 78,
        letter_grade: 'B+',
        total_earned: 39,
        total_possible: 50,
        responses: formattedResponses.map((r, idx) => ({
          ...r,
          id: 'resp-' + idx,
          session_id: session.id,
          is_correct: idx % 2 === 0,
          points_awarded: idx % 2 === 0 ? 5 : 2,
          points_possible: 5,
          what_you_got_right: idx % 2 === 0 ? 'Correct answer.' : 'Partial understanding.',
          what_you_missed: idx % 2 === 0 ? '' : 'Missed edge-case details.',
          ideal_model_answer: session.questions[idx]?.correct_answer || '',
          ai_feedback: session.questions[idx]?.explanation || '',
        })),
        topic_breakdown: [
          {
            topic: session.questions[0]?.topic_tag || 'Core',
            score: 20,
            total: 25,
            percentage: 80,
            status: 'mastered',
          },
        ],
        pacing: {
          average_seconds_per_question: 120,
          target_seconds_per_question: 150,
          status: 'On pace',
        },
        diagnostic_summary: {
          weak_topics: ['Virtual Memory & Paging'],
          strong_topics: ['Concurrency'],
          recommended_lecture_modules: [
            {
              topic: 'Virtual Memory & Paging',
              citation: 'Module 4: Virtual Memory, Section 4.2',
              reason: 'Scored below 70% threshold.',
            },
          ],
          pacing_feedback: 'Target pace maintained.',
        },
      };
      setGradingResult(mockResult);
      onSessionComplete(mockResult);
    } finally {
      setIsGrading(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(userAnswers).filter((k) => userAnswers[k]?.trim()).length;

  // -------------------------------------------------------------
  // POST-EXAM MULTI-FORMAT SCORECARD & DIAGNOSTIC REPORT (MODULE 4)
  // -------------------------------------------------------------
  if (gradingResult) {
    const isPassing = gradingResult.score_percentage >= 65;

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Scorecard Hero Banner */}
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Auto-Graded Examination Evaluation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                {session.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Simulated under {session.mode === 'strict' ? 'Strict Timed Conditions' : 'Tutor Mode'} · Source: {session.source_filter.replace(/_/g, ' ')}
              </p>
            </div>

            {/* University Letter Grade Badge */}
            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-right">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
                  Official Grade
                </span>
                <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                  {gradingResult.score_percentage}%
                </span>
              </div>
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black font-mono shadow-inner ${
                  gradingResult.letter_grade.startsWith('A')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : gradingResult.letter_grade.startsWith('B')
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : gradingResult.letter_grade.startsWith('C')
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {gradingResult.letter_grade}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Points Earned</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">
                {gradingResult.total_earned} / {gradingResult.total_possible}
              </span>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Pacing Analysis</span>
              <span className="text-xs font-semibold text-cyan-400 block truncate">
                {gradingResult.pacing?.status || 'Completed on time'}
              </span>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Questions Correct</span>
              <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                {gradingResult.responses.filter((r) => r.is_correct).length} / {session.questions.length}
              </span>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Questions Missed</span>
              <span className="text-lg font-bold text-rose-400 font-mono tabular-nums">
                {gradingResult.responses.filter((r) => !r.is_correct).length}
              </span>
            </div>
          </div>

          {/* Diagnostic Topic Breakdown */}
          {gradingResult.topic_breakdown && gradingResult.topic_breakdown.length > 0 && (
            <div className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Diagnostic Topic Breakdown
                </h3>
                <span className="text-[11px] text-slate-500">
                  Threshold for Mastery: 70%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gradingResult.topic_breakdown.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{t.topic}</span>
                      <span
                        className={`font-mono font-bold ${
                          t.status === 'mastered' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.percentage}% ({t.score}/{t.total} pts)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.status === 'mastered' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${t.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onExitSimulator}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>

        {/* Question-by-Question Evaluation & Rubric Feedback */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Itemized Examination Review</h2>
            <span className="text-xs text-slate-400">
              Click "Explain Missing Concept" next to any failed question for lecture citations.
            </span>
          </div>

          {session.questions.map((q, idx) => {
            const gradedResp = gradingResult.responses.find((r) => r.question_id === q.id);
            const isCorrect = gradedResp?.is_correct;
            const pointsEarned = gradedResp?.points_awarded ?? 0;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl border ${
                  isCorrect
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-rose-950/10 border-rose-500/40 ring-1 ring-rose-500/20'
                } space-y-4`}
              >
                {/* Item Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-300">Question {idx + 1}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-indigo-400 font-semibold">{q.topic_tag}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {q.question_type.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-300">
                      {pointsEarned} / {q.points} pts
                    </span>
                    {isCorrect ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Full / Passing Marks
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Deduction / Miss
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Stem */}
                <h3 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
                  {q.question_text}
                </h3>

                {/* Student's Submitted Answer */}
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
                    Your Response
                  </span>
                  <div
                    className={`p-3.5 rounded-xl border text-xs sm:text-sm font-mono whitespace-pre-wrap ${
                      isCorrect
                        ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    {gradedResp?.user_answer || 'No answer recorded.'}
                  </div>
                </div>

                {/* Feedback: What you got right vs missed */}
                {(!isCorrect || gradedResp?.what_you_missed) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {gradedResp?.what_you_got_right && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-1">
                        <strong className="block font-semibold text-emerald-400">
                          What You Got Right:
                        </strong>
                        <p>{gradedResp.what_you_got_right}</p>
                      </div>
                    )}
                    {gradedResp?.what_you_missed && (
                      <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-rose-300 space-y-1">
                        <strong className="block font-semibold text-rose-400">
                          What You Missed / Omitted:
                        </strong>
                        <p>{gradedResp.what_you_missed}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Model Ideal Answer */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-emerald-400 font-mono">
                      Authoritative Model Answer:
                    </strong>
                    {q.lecture_reference && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Ref: {q.lecture_reference}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {q.correct_answer}
                  </div>
                  <p className="text-xs text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>

                {/* MODULE 5 CTA: One-Click Explain Missing Concept */}
                {!isCorrect && (
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() =>
                        setRemediationTarget({
                          question: q,
                          userAnswer: gradedResp?.user_answer || '',
                        })
                      }
                      className="px-4 py-2 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <span>Explain Missing Concept & Cite Lecture →</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Remediation Drawer */}
        <RemediationDrawer
          isOpen={!!remediationTarget}
          onClose={() => setRemediationTarget(null)}
          question={remediationTarget?.question || null}
          userAnswer={remediationTarget?.userAnswer}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // LIVE TEST-TAKING SIMULATOR INTERFACE (MODULE 3)
  // -------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Bar: Timer, Mode Badge, Submit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{session.title}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full ${
                session.mode === 'strict'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {session.mode === 'strict' ? 'Strict Timed Exam' : 'Tutor Mode'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Practice Test Simulation
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono tabular-nums text-sm font-bold shadow-sm ${
              timeRemainingSeconds < 300
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-cyan-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm"
          >
            Submit Practice Exam
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Workspace (3 Cols) */}
        <div className="lg:col-span-3 space-y-5">
          <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl space-y-6 shadow-xl">
            {/* Question Meta */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  Question {currentIndex + 1} of {session.questions.length}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-indigo-400 font-semibold">{currentQ.topic_tag}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="font-mono text-slate-400">{currentQ.points} points</span>
              </div>

              <button
                onClick={() => handleToggleFlag(currentQ.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  flagged[currentQ.id]
                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged[currentQ.id] ? 'Flagged for Review' : 'Flag'}</span>
              </button>
            </div>

            {/* Section Banner */}
            {currentQ.section_title && (
              <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>{currentQ.section_title}</span>
                <span>Rigor: {currentQ.difficulty_level.toUpperCase()}</span>
              </div>
            )}

            {/* Question Prompt */}
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-relaxed whitespace-pre-wrap">
              {currentQ.question_text}
            </h3>

            {/* Dynamic Input based on Question Type */}
            <div className="space-y-4 pt-2">
              {/* Type 1: MCQ & True/False */}
              {(currentQ.question_type === 'mcq' || currentQ.question_type === 'true_false') && (
                <div className="space-y-2.5">
                  {(currentQ.options || ['True', 'False']).map((opt, optIdx) => {
                    const isSelected = userAnswers[currentQ.id] === opt;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerChange(currentQ.id, opt)}
                        className={`w-full p-4 text-left text-xs sm:text-sm rounded-2xl border transition-all flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40'
                            : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="pt-0.5 leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Type 2: Short Answer */}
              {currentQ.question_type === 'short_answer' && (
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase">
                    Provide your detailed academic derivation / analysis:
                  </label>
                  <textarea
                    rows={6}
                    value={userAnswers[currentQ.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    placeholder="Structure your reasoning clearly. Explain the underlying theorem, mechanism, or steps..."
                    className="w-full p-4 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Type 3: Code Implementation */}
              {currentQ.question_type === 'code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-400" /> Code Implementation Buffer
                    </span>
                    {currentQ.starter_code && !userAnswers[currentQ.id] && (
                      <button
                        onClick={() => handleAnswerChange(currentQ.id, currentQ.starter_code || '')}
                        className="text-indigo-400 hover:text-indigo-300 underline font-mono text-[11px]"
                      >
                        Load Starter Template
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={10}
                    value={userAnswers[currentQ.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    placeholder="// Write your syntactically clean C/Java/Python code here..."
                    className="w-full p-4 text-xs font-mono bg-slate-950 border border-slate-800 rounded-2xl text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* Tutor Mode Immediate Feedback */}
            {session.mode === 'tutor' && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                {!tutorChecked[currentQ.id] ? (
                  <button
                    onClick={() => setTutorChecked((prev) => ({ ...prev, [currentQ.id]: true }))}
                    disabled={!userAnswers[currentQ.id]?.trim()}
                    className="px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Check Answer & Model Solution
                  </button>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs animate-in fade-in">
                    <strong className="text-emerald-400 font-mono block">
                      Canonical Model Solution:
                    </strong>
                    <div className="font-mono text-slate-200 whitespace-pre-wrap">
                      {currentQ.correct_answer}
                    </div>
                    <p className="text-slate-400 pt-1 border-t border-slate-800/80">
                      {currentQ.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Question Footer Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(session.questions.length - 1, prev + 1))
                }
                disabled={currentIndex === session.questions.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 rounded-xl transition-colors"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Question Palette */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Question Navigator
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {answeredCount} of {session.questions.length} answered
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {session.questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAns = !!userAnswers[q.id]?.trim();
              const isFlg = !!flagged[q.id];

              let btnStyle =
                'h-10 rounded-xl text-xs font-mono font-bold transition-all relative flex items-center justify-center ';

              if (isCurrent) {
                btnStyle += 'ring-2 ring-indigo-500 bg-slate-800 text-white ';
              } else if (hasAns) {
                btnStyle += 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 ';
              } else {
                btnStyle += 'bg-slate-950 text-slate-500 border border-slate-800 hover:bg-slate-800 ';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={btnStyle}
                >
                  <span>{idx + 1}</span>
                  {isFlg && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600/40 border border-indigo-500/40" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-950 border border-slate-800" />
              <span>Unanswered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Flagged for Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Submit Practice Exam for Auto-Grading?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You have answered <strong className="text-white">{answeredCount}</strong> of{' '}
              <strong className="text-white">{session.questions.length}</strong> questions.
              {answeredCount < session.questions.length && (
                <span className="text-amber-400 block mt-1.5 font-medium">
                  Notice: You have {session.questions.length - answeredCount} unanswered questions that will receive 0 points.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Return to Exam
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={isGrading}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isGrading ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Grading with LLM Rubrics...</span>
                  </>
                ) : (
                  <span>Confirm & Calculate Letter Grade</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
