import React, { useState, useEffect } from 'react';
import { MockExamQuestion, MistakeRecord, ExamAttempt } from '../types/study';
import {
  Award,
  Clock,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeepMockExamViewProps {
  questions: MockExamQuestion[];
  subjectTitle: string;
  suiteId: string;
  onRecordMistake: (
    mistake: Omit<MistakeRecord, 'id' | 'timestamp' | 'attemptCount' | 'status'>
  ) => void;
  onRecordAttempt: (attempt: ExamAttempt) => void;
  onNavigateToMistakes: () => void;
}

export const DeepMockExamView: React.FC<DeepMockExamViewProps> = ({
  questions,
  subjectTitle,
  suiteId,
  onRecordMistake,
  onRecordAttempt,
  onNavigateToMistakes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [qIndex: number]: boolean }>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Initialize total exam time (sum of suggested question time limits or standard 25 mins)
  useEffect(() => {
    const totalTime = questions.reduce((acc, q) => acc + (q.timeLimitSeconds || 150), 0);
    setTimeRemainingSeconds(totalTime || 900);
    setIsTimerRunning(true);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setCurrentIndex(0);
    setIsExamSubmitted(false);
  }, [questions]);

  // Countdown timer
  useEffect(() => {
    if (!isTimerRunning || isExamSubmitted) return;

    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, isExamSubmitted]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optIndex: number) => {
    if (isExamSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optIndex,
    }));
  };

  const handleToggleFlag = (qIndex: number) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qIndex]: !prev[qIndex],
    }));
  };

  const handleSubmitExam = () => {
    setIsExamSubmitted(true);
    setIsTimerRunning(false);
    setShowSubmitModal(false);

    let totalEarned = 0;
    const totalPossible = questions.reduce((sum, q) => sum + (q.points || 10), 0);
    const answersRecord: ExamAttempt['answers'] = [];

    questions.forEach((q, idx) => {
      const studentAns = selectedAnswers[idx];
      const isCorrect = studentAns === q.correctIndex;
      const pts = q.points || 10;

      if (isCorrect) {
        totalEarned += pts;
      } else {
        // Automatically log every wrong answer to the student's Mistake Vault!
        onRecordMistake({
          questionId: q.id,
          question: q.question,
          scenario: q.scenario,
          options: q.options,
          userAnswerIndex: studentAns !== undefined ? studentAns : -1,
          correctAnswerIndex: q.correctIndex,
          userAnswerText: studentAns !== undefined ? q.options[studentAns] : 'Unanswered / Skipped',
          correctAnswerText: q.options[q.correctIndex] || '',
          explanation: q.explanation,
          topic: q.topic,
          sourceType: 'mock_exam',
          sourceSuiteTitle: subjectTitle,
          category: 'concept_confusion',
        });
      }

      answersRecord.push({
        questionId: q.id,
        selectedIndex: studentAns !== undefined ? studentAns : -1,
        isCorrect: isCorrect,
      });
    });

    const percentage = Math.round((totalEarned / (totalPossible || 1)) * 100);

    // Record overall attempt to localStorage history
    onRecordAttempt({
      id: 'attempt-' + Date.now(),
      suiteId: suiteId,
      suiteTitle: subjectTitle,
      score: totalEarned,
      totalPoints: totalPossible,
      percentage: percentage,
      timeSpentSeconds: questions.reduce((acc, q) => acc + (q.timeLimitSeconds || 150), 0) - timeRemainingSeconds,
      completedAt: Date.now(),
      answers: answersRecord,
    });

    if (percentage >= 80) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-slate-400">
        <Award className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Mock Exam Questions Ready</h3>
        <p className="text-xs text-slate-500 mt-1">
          Upload schoolwork or select another deck to generate a deep mock exam.
        </p>
      </div>
    );
  }

  // Answered count
  const answeredCount = Object.keys(selectedAnswers).length;

  // Post-Exam Comprehensive Review
  if (isExamSubmitted) {
    const totalPossible = questions.reduce((sum, q) => sum + (q.points || 10), 0);
    let totalEarned = 0;
    let missedCount = 0;

    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        totalEarned += q.points || 10;
      } else {
        missedCount++;
      }
    });

    const percentage = Math.round((totalEarned / totalPossible) * 100);

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Results Banner */}
        <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs text-cyan-400 font-medium">Exam Complete</span>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                Deep Works Mock Exam Evaluation
              </h2>
              <p className="text-xs text-slate-400">{subjectTitle}</p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Exam Grade</span>
              <span
                className={`text-3xl font-extrabold font-mono tabular-nums ${
                  percentage >= 80
                    ? 'text-emerald-400'
                    : percentage >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {percentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Points Scored</span>
              <span className="text-lg font-bold text-white font-mono tabular-nums">
                {totalEarned} / {totalPossible}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Time Remaining</span>
              <span className="text-lg font-bold text-cyan-400 font-mono tabular-nums">
                {formatTime(timeRemainingSeconds)}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Missed Questions</span>
              <span className="text-lg font-bold text-rose-400 font-mono tabular-nums">
                {missedCount}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-500 block mb-0.5">Status</span>
              <span
                className={`text-sm font-semibold block ${
                  percentage >= 80
                    ? 'text-emerald-400'
                    : percentage >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {percentage >= 80 ? 'Mastery Tier' : 'Needs Review'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {missedCount > 0 && (
              <button
                onClick={onNavigateToMistakes}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Open Mistake Vault ({missedCount} Misses Logged) →</span>
              </button>
            )}
            <button
              onClick={() => {
                setIsExamSubmitted(false);
                setSelectedAnswers({});
                setFlaggedQuestions({});
                setCurrentIndex(0);
                const totalTime = questions.reduce((acc, q) => acc + (q.timeLimitSeconds || 150), 0);
                setTimeRemainingSeconds(totalTime || 900);
                setIsTimerRunning(true);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Mock Exam</span>
            </button>
          </div>
        </div>

        {/* Question-by-Question Rubric Review */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white">Item-by-Item Rubric & Analysis</h3>

          {questions.map((q, idx) => {
            const studentChoice = selectedAnswers[idx];
            const isCorrect = studentChoice === q.correctIndex;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl border ${
                  isCorrect
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-rose-950/10 border-rose-500/30'
                } space-y-4`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Question {idx + 1}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-indigo-400">{q.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-slate-400">
                      {q.points || 10} pts
                    </span>
                    {isCorrect ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Correct
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Missed
                      </span>
                    )}
                  </div>
                </div>

                {q.scenario && (
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 italic leading-relaxed">
                    <strong>Scenario Context:</strong> {q.scenario}
                  </div>
                )}

                <h4 className="text-sm font-semibold text-slate-100">{q.question}</h4>

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isStudentPick = studentChoice === optIdx;
                    const isRightAnswer = optIdx === q.correctIndex;

                    let optStyle = 'p-3 rounded-lg text-xs border flex items-start gap-2.5 ';
                    if (isRightAnswer) {
                      optStyle += 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 font-medium';
                    } else if (isStudentPick && !isRightAnswer) {
                      optStyle += 'bg-rose-950/40 border-rose-500/60 text-rose-200 line-through';
                    } else {
                      optStyle += 'bg-slate-950/40 border-slate-800/60 text-slate-400';
                    }

                    return (
                      <div key={optIdx} className={optStyle}>
                        <span className="font-mono font-semibold shrink-0">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span>{opt}</span>
                        {isRightAnswer && (
                          <span className="ml-auto text-[11px] text-emerald-400 shrink-0 font-sans font-semibold">
                            Correct Answer
                          </span>
                        )}
                        {isStudentPick && !isRightAnswer && (
                          <span className="ml-auto text-[11px] text-rose-400 shrink-0 font-sans font-semibold">
                            Your Pick
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Deep Reasoning */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2">
                  <strong className="text-slate-300 block font-semibold">
                    Comprehensive Conceptual Rationale:
                  </strong>
                  <p className="text-slate-300 leading-relaxed">{q.explanation}</p>

                  {/* Rubric Points */}
                  {q.rubric && q.rubric.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <strong className="text-indigo-300 block text-[11px] uppercase tracking-wider">
                        Grading Rubric Criteria:
                      </strong>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[11px]">
                        {q.rubric.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Live Exam Simulation Mode
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Exam Header & Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{subjectTitle}</span>
            <span aria-hidden="true">·</span>
            <span>Deep Works Mock Exam</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            Timed Scenario Simulation
          </h2>
        </div>

        {/* Live Timer & Submit */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono tabular-nums text-sm font-bold ${
              timeRemainingSeconds < 180
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-cyan-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Finish & Submit Exam
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Question Workspace */}
        <div className="lg:col-span-3 space-y-5">
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5 shadow-lg">
            {/* Topic & Flag */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-indigo-400">{currentQ.topic}</span>
              </div>

              <button
                onClick={() => handleToggleFlag(currentIndex)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  flaggedQuestions[currentIndex]
                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flaggedQuestions[currentIndex] ? 'Flagged' : 'Flag for Review'}</span>
              </button>
            </div>

            {/* Scenario / Case Description */}
            {currentQ.scenario && (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Case Investigation / Scenario
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {currentQ.scenario}
                </p>
              </div>
            )}

            {/* Question Text */}
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">
              {currentQ.question}
            </h3>

            {/* Options */}
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 text-left text-xs sm:text-sm rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-indigo-100 shadow-sm'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-mono font-semibold ${
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

            {/* Question Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                }
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-lg transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Question Palette */}
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Question Navigator
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {answeredCount} of {questions.length} answered
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {questions.map((_, idx) => {
              const isCurrent = idx === currentIndex;
              const isAnswered = selectedAnswers[idx] !== undefined;
              const isFlagged = flaggedQuestions[idx];

              let btnClass =
                'h-9 rounded-lg text-xs font-mono font-semibold transition-all relative flex items-center justify-center ';

              if (isCurrent) {
                btnClass += 'ring-2 ring-indigo-500 bg-slate-800 text-white ';
              } else if (isAnswered) {
                btnClass += 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 ';
              } else {
                btnClass += 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 ';
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={btnClass}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-500">
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

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Ready to Submit Exam?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You have answered <strong className="text-white">{answeredCount}</strong> of{' '}
              <strong className="text-white">{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="text-amber-400 block mt-1">
                  Warning: You have {questions.length - answeredCount} unanswered questions remaining.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Back to Exam
              </button>
              <button
                onClick={handleSubmitExam}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Confirm & Grade Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
