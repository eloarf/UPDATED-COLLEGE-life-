import React, { useState } from 'react';
import { RecoveryQuestion } from '../types/study';
import { CheckCircle2, XCircle, Sparkles, X, ArrowRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RecoveryQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: RecoveryQuestion[];
  onComplete: (score: number, total: number) => void;
}

export const RecoveryQuizModal: React.FC<RecoveryQuizModalProps> = ({
  isOpen,
  onClose,
  questions,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen || !questions || questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onComplete(score + (selectedOption === currentQ.correctIndex ? 1 : 0), questions.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Targeted Recovery Drill</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isFinished ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-indigo-400">{currentQ.topic}</span>
            </div>

            <h3 className="text-sm sm:text-base font-semibold text-white">
              {currentQ.question}
            </h3>

            {currentQ.targetedMisconception && (
              <p className="text-[11px] text-amber-400 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                Targeting: {currentQ.targetedMisconception}
              </p>
            )}

            <div className="space-y-2 pt-1">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;

                let btnClass = 'w-full p-3.5 text-left text-xs rounded-xl border flex items-start gap-2.5 ';
                if (!isAnswered) {
                  btnClass += 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200 cursor-pointer';
                } else if (isCorrect) {
                  btnClass += 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium';
                } else if (isSelected && !isCorrect) {
                  btnClass += 'bg-rose-950/40 border-rose-500 text-rose-200';
                } else {
                  btnClass += 'bg-slate-950/40 border-slate-800 text-slate-500';
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelect(idx)}
                    className={btnClass}
                  >
                    <span className="font-mono font-bold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={handleNext}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5"
                  >
                    <span>{currentIndex < questions.length - 1 ? 'Next Recovery Question' : 'View Results'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Recovery Drill Complete!</h3>
            <p className="text-xs text-slate-300">
              You scored <strong className="text-emerald-400 font-mono">{score}</strong> of{' '}
              <strong className="text-white font-mono">{questions.length}</strong> on targeted weak areas.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
            >
              Return to Mistake Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
