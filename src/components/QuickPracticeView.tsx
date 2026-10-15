import React, { useState, useEffect } from 'react';
import { QuickQuestion, MistakeRecord } from '../types/study';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Zap,
  Flame,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickPracticeViewProps {
  questions: QuickQuestion[];
  subjectTitle: string;
  onRecordMistake: (
    mistake: Omit<MistakeRecord, 'id' | 'timestamp' | 'attemptCount' | 'status'>
  ) => void;
  onNavigateToMistakes: () => void;
}

export const QuickPracticeView: React.FC<QuickPracticeViewProps> = ({
  questions,
  subjectTitle,
  onRecordMistake,
  onNavigateToMistakes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionMistakes, setSessionMistakes] = useState<QuickQuestion[]>([]);

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowHint(false);
    setScore(0);
    setStreak(0);
    setIsComplete(false);
    setSessionMistakes([]);
  }, [questions]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;

    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ.correctIndex;

    if (isCorrect) {
      setScore((prev) => prev + 10);
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
      setSessionMistakes((prev) => [...prev, currentQ]);

      // Automatically log to the Mistake Vault as requested by user!
      onRecordMistake({
        questionId: currentQ.id,
        question: currentQ.question,
        options: currentQ.options,
        userAnswerIndex: index,
        correctAnswerIndex: currentQ.correctIndex,
        userAnswerText: currentQ.options[index] || '',
        correctAnswerText: currentQ.options[currentQ.correctIndex] || '',
        explanation: currentQ.explanation,
        topic: currentQ.topic,
        sourceType: 'quick_practice',
        sourceSuiteTitle: subjectTitle,
        category: 'concept_confusion',
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowHint(false);
    } else {
      setIsComplete(true);
      // Fire confetti if high score
      const finalAccuracy = ((score + (selectedOption === currentQ.correctIndex ? 10 : 0)) / (questions.length * 10)) * 100;
      if (finalAccuracy >= 75) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setShowHint(false);
    setScore(0);
    setStreak(0);
    setIsComplete(false);
    setSessionMistakes([]);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-slate-400">
        <Zap className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Practice Questions Ready</h3>
        <p className="text-xs text-slate-500 mt-1">
          Upload schoolwork or select another deck to generate practice drills.
        </p>
      </div>
    );
  }

  // Completion View
  if (isComplete) {
    const accuracy = Math.round((score / (questions.length * 10)) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Award className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Drill Complete
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Practice Session Results
          </h2>
          <p className="text-xs text-slate-400">{subjectTitle}</p>
        </div>

        {/* Score Card */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <div>
            <span className="text-xs text-slate-500 block mb-1">Score Earned</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {score}
            </span>
            <span className="text-[11px] text-slate-500 block font-mono">
              / {questions.length * 10} pts
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Accuracy</span>
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                accuracy >= 80
                  ? 'text-emerald-400'
                  : accuracy >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {accuracy}%
            </span>
            <span className="text-[11px] text-slate-500 block">
              {accuracy >= 80 ? 'Mastery Tier' : 'Needs Reinforcement'}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1">Missed Logged</span>
            <span className="text-2xl font-bold text-rose-400 font-mono tabular-nums">
              {sessionMistakes.length}
            </span>
            <span className="text-[11px] text-slate-500 block">Saved to Vault</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRestart}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Drill</span>
          </button>

          {sessionMistakes.length > 0 && (
            <button
              onClick={onNavigateToMistakes}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Review Missed Questions ({sessionMistakes.length}) →</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Status & Streak */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{subjectTitle}</span>
            <span aria-hidden="true">·</span>
            <span>Question {currentIndex + 1} of {questions.length}</span>
          </div>
          <h2 className="text-lg font-bold text-white">Rapid Concept Drill</h2>
        </div>

        <div className="flex items-center gap-4">
          {streak > 1 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-medium">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-mono tabular-nums">{streak} streak</span>
            </div>
          )}

          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Session Score</span>
            <span className="text-sm font-bold text-indigo-400 font-mono tabular-nums">
              {score} pts
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
        <div
          className="bg-amber-500 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-5 shadow-lg">
        {/* Topic Tag & Rigor */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="text-indigo-400 font-medium">{currentQ.topic}</span>
          <span className="capitalize text-slate-500 font-mono">{currentQ.difficulty}</span>
        </div>

        {/* Prompt */}
        <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-snug">
          {currentQ.question}
        </h3>

        {/* Hint Disclosure */}
        {currentQ.hint && (
          <div>
            {!showHint ? (
              <button
                onClick={() => setShowHint(true)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Show Hint</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{currentQ.hint}</span>
              </div>
            )}
          </div>
        )}

        {/* Multiple Choice Options */}
        <div className="space-y-2.5 pt-2">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let optionClasses =
              'w-full p-4 text-left text-xs sm:text-sm rounded-xl border transition-all flex items-start gap-3 ';

            if (!isAnswered) {
              optionClasses +=
                'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-200 cursor-pointer';
            } else if (isCorrect) {
              optionClasses +=
                'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 font-medium shadow-sm';
            } else if (isSelected && !isCorrect) {
              optionClasses +=
                'bg-rose-950/40 border-rose-500/80 text-rose-200 font-medium shadow-sm';
            } else {
              optionClasses += 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60';
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={optionClasses}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-mono font-semibold ${
                    !isAnswered
                      ? 'bg-slate-800 text-slate-400'
                      : isCorrect
                      ? 'bg-emerald-500 text-white'
                      : isSelected
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800/60 text-slate-600'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="pt-0.5 leading-relaxed">{option}</span>
                {isAnswered && isCorrect && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0 mt-0.5" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-4 h-4 text-rose-400 ml-auto shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detailed Feedback & Misconception Warning (Revealed after selection) */}
        {isAnswered && (
          <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-in fade-in duration-300">
            {selectedOption === currentQ.correctIndex ? (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-emerald-200 font-semibold mb-0.5">
                    Correct! +10 Points
                  </strong>
                  <span>{currentQ.explanation}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-rose-200 font-semibold mb-0.5">
                      Incorrect · Automatically Logged to Mistake Vault
                    </strong>
                    <span>{currentQ.explanation}</span>
                  </div>
                </div>

                {currentQ.misconceptionWarning && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-200 font-semibold mb-0.5">
                        Common Misconception Trap:
                      </strong>
                      <span>{currentQ.misconceptionWarning}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next Question CTA */}
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={handleNext}
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
