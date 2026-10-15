import React from 'react';
import { StudySuite } from '../types/study';
import { Layers, Zap, Award, AlertCircle, Upload, Check, FileText, ArrowRight } from 'lucide-react';

interface MaterialsOverviewViewProps {
  activeSuite: StudySuite | null;
  suites: StudySuite[];
  onSelectSuite: (id: string) => void;
  onNavigateTab: (tab: 'flashcards' | 'practice' | 'mock-exam' | 'mistakes') => void;
  onOpenUpload: () => void;
  unresolvedMistakeCount: number;
}

export const MaterialsOverviewView: React.FC<MaterialsOverviewViewProps> = ({
  activeSuite,
  suites,
  onSelectSuite,
  onNavigateTab,
  onOpenUpload,
  unresolvedMistakeCount,
}) => {
  if (!activeSuite) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 mb-4">
          <Upload className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Schoolwork Material Loaded</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Upload a PDF or Word document from your school coursework, syllabus, or lecture slides to automatically generate flashcards, quick practice drills, and mock exams.
        </p>
        <button
          onClick={onOpenUpload}
          className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload PDF or Word Document</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Visual Banner & Deck Header */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60">
        <div className="absolute inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none">
          <img
            src="/src/assets/images/hero_study_scholar_1790933781660.jpg"
            alt="Scholarly study desk"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
            <span>Course Material</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{activeSuite.sourceName}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
            {activeSuite.subjectTitle}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            {activeSuite.summary}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <strong className="text-slate-200">{activeSuite.flashcards.length}</strong> Flashcards
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <strong className="text-slate-200">{activeSuite.quickPractice.length}</strong> Quick Practice Questions
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-cyan-400" />
              <strong className="text-slate-200">{activeSuite.deepMockExam.length}</strong> Deep Mock Exam Scenarios
            </span>
          </div>
        </div>
      </div>

      {/* Assorted Study Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Assorted Study Modes</h2>
            <p className="text-xs text-slate-400">
              Select how you want to drill this coursework today.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Flashcards */}
          <div
            onClick={() => onNavigateTab('flashcards')}
            className="p-5 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  Interactive Flashcards
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  3D flip cards with spaced repetition ratings, active recall prompts, and memory anchors.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono tabular-nums">
                {activeSuite.flashcards.length} cards ready
              </span>
              <span className="text-indigo-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Review <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Quick Practice */}
          <div
            onClick={() => onNavigateTab('practice')}
            className="p-5 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Quick Practice Drills
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Rapid-fire questions with immediate answer feedback, hints, and common misconception alerts.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono tabular-nums">
                {activeSuite.quickPractice.length} questions
              </span>
              <span className="text-amber-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Start Drill <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Deep Works Mock Exam */}
          <div
            onClick={() => onNavigateTab('mock-exam')}
            className="p-5 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  Deep Works Mock Exam
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Realistic timed exam environment with multi-step scenario questions and complete grading rubrics.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono tabular-nums">
                {activeSuite.deepMockExam.length} scenarios
              </span>
              <span className="text-cyan-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Take Exam <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 4: Mistakes & Performance */}
          <div
            onClick={() => onNavigateTab('mistakes')}
            className="p-5 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/50 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors">
                  Mistake Vault & Charts
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Diagnostic charts of missed questions, weakness breakdown, and targeted AI recovery plans.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-rose-400/90 font-mono tabular-nums">
                {unresolvedMistakeCount} unresolved errors
              </span>
              <span className="text-rose-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Charts <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Topics Breakdown */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Extracted Conceptual Syllabus</h2>
          <p className="text-xs text-slate-400">
            Key academic domains identified in this coursework with estimated exam weight.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeSuite.topics.map((t, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{t.name}</span>
                <span className="font-mono tabular-nums text-slate-400">
                  Weight: {t.importanceWeight}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${t.importanceWeight}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{t.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Schoolwork Decks */}
      {suites.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Other Uploaded Decks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suites
              .filter((s) => s.id !== activeSuite.id)
              .map((suite) => (
                <div
                  key={suite.id}
                  onClick={() => onSelectSuite(suite.id)}
                  className="p-3.5 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-0.5 truncate">
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                      {suite.subjectTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      {suite.sourceName} · {suite.flashcards.length} cards
                    </p>
                  </div>
                  <span className="text-xs text-indigo-400 group-hover:underline shrink-0 font-medium">
                    Switch
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
