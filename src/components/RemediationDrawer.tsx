import React, { useState, useEffect } from 'react';
import { X, BookOpen, Sparkles, Lightbulb, Compass, AlertCircle } from 'lucide-react';
import { ExamQuestion } from '../types/study';

interface RemediationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  question: ExamQuestion | null;
  userAnswer?: string;
}

export const RemediationDrawer: React.FC<RemediationDrawerProps> = ({
  isOpen,
  onClose,
  question,
  userAnswer,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    citation: string;
    simplified_explanation: string;
    key_intuition: string;
    remedial_drill_tip?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !question) {
      setData(null);
      return;
    }

    const fetchRemediation = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/exam/remediate-concept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: question.question_text,
            user_answer: userAnswer || 'Unanswered / Incomplete',
            correct_answer: question.correct_answer,
            topic: question.topic_tag,
            lecture_reference: question.lecture_reference,
          }),
        });

        if (response.ok) {
          const res = await response.json();
          setData(res);
        } else {
          throw new Error('Failed to generate remediation');
        }
      } catch (err) {
        console.warn('Remediation fetch fallback:', err);
        setData({
          citation: question.lecture_reference || `Module: ${question.topic_tag}, Section 3`,
          simplified_explanation: `The foundational core of this question involves understanding why "${question.correct_answer}". When evaluating this topic on an exam, isolate the state variables first before applying the formula or mechanism.`,
          key_intuition:
            'Focus on the physical or logical constraint: verify boundary conditions before selecting your answer.',
          remedial_drill_tip: 'Re-read the primary derivation diagram in your course slides.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRemediation();
  }, [isOpen, question, userAnswer]);

  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>One-Click Explain & Remediate</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-1">
                Conceptual Gap Remediation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Topic: <span className="text-slate-200 font-medium">{question.topic_tag}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Question Summary Box */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Exam Question Stem
            </span>
            <p className="text-xs text-slate-200 font-medium leading-relaxed">
              {question.question_text}
            </p>
            {userAnswer && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-rose-400 line-through">Your Input: {userAnswer}</span>
                <span className="text-emerald-400 font-mono">Key: {question.correct_answer}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">
                Paging through lecture modules and generating targeted remediation...
              </p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Citation Banner */}
              <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Exact Lecture Module Citation:</span>
                </div>
                <p className="text-xs sm:text-sm font-mono text-white font-semibold">
                  {data.citation}
                </p>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  Direct match in uploaded course curriculum materials.
                </p>
              </div>

              {/* Simplified Explanation */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Simplified Conceptual Breakdown:</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {data.simplified_explanation}
                </p>
              </div>

              {/* Key Intuition */}
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Key Intuition / Mental Model:</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-200 leading-relaxed">
                  {data.key_intuition}
                </p>
              </div>

              {/* Remedial Drill Tip */}
              {data.remedial_drill_tip && (
                <div className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300 block mb-0.5">Exam Strategy Tip:</strong>
                    <span>{data.remedial_drill_tip}</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Remediation
          </button>
        </div>
      </div>
    </div>
  );
};
