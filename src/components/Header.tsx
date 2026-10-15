import React from 'react';
import { StudySuite } from '../types/study';
import {
  Upload,
  AlertCircle,
  BookOpen,
  Zap,
  Award,
  Layers,
  Radar,
  Play,
  FileCheck2,
  Calendar,
} from 'lucide-react';

interface HeaderProps {
  activeTab:
    | 'upload'
    | 'flashcards'
    | 'practice'
    | 'mock-exam'
    | 'mistakes'
    | 'simulator'
    | 'radar'
    | 'aastu'
    | 'calendar';
  setActiveTab: (
    tab:
      | 'upload'
      | 'flashcards'
      | 'practice'
      | 'mock-exam'
      | 'mistakes'
      | 'simulator'
      | 'radar'
      | 'aastu'
      | 'calendar'
  ) => void;
  suites: StudySuite[];
  activeSuite: StudySuite | null;
  onSelectSuite: (suiteId: string) => void;
  onOpenUploadModal: () => void;
  onOpenPastExamModal: () => void;
  unresolvedMistakeCount: number;
  questionBankCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  suites,
  activeSuite,
  onSelectSuite,
  onOpenUploadModal,
  onOpenPastExamModal,
  unresolvedMistakeCount,
  questionBankCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Clean text nav links) - Zone 3 (1-2 Primary actions) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('simulator')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400 transition-colors">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                ScholarStream
              </span>
            </div>
          </button>

          {/* Active Suite / Course selector */}
          {suites.length > 0 && activeSuite && (
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <span className="text-slate-500">Course:</span>
              <select
                value={activeSuite.id}
                onChange={(e) => onSelectSuite(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1 focus:outline-none focus:border-indigo-500 max-w-[180px] truncate"
              >
                {suites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectTitle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 sm:gap-2">
          {/* Module 3 & 4: Exam Simulator */}
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'text-indigo-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Exam Simulator</span>
            {activeTab === 'simulator' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          {/* Module 2: High-Yield Topic Radar */}
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'radar'
                ? 'text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Topic Radar</span>
            {activeTab === 'radar' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Modules</span>
            {activeTab === 'upload' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-slate-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'flashcards'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
            {activeTab === 'flashcards' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-slate-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'practice'
                ? 'text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Practice</span>
            {activeTab === 'practice' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'mistakes'
                ? 'text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Mistake Vault</span>
            {unresolvedMistakeCount > 0 && (
              <span className="ml-0.5 text-[11px] font-mono tabular-nums px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                {unresolvedMistakeCount}
              </span>
            )}
            {activeTab === 'mistakes' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-rose-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('aastu')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'aastu'
                ? 'text-[#58a6ff] font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            <span>AASTU 4.0 OS</span>
            {activeTab === 'aastu' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#58a6ff] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'text-[#f472b6] font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#f472b6]" />
            <span>Calendar</span>
            {activeTab === 'calendar' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#f472b6] rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenPastExamModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/40 rounded-lg transition-colors whitespace-nowrap"
            title="Upload and parse past exam papers or scanned exam photos"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ingest Past Exam</span>
          </button>

          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Module</span>
          </button>
        </div>
      </div>
    </header>
  );
};
