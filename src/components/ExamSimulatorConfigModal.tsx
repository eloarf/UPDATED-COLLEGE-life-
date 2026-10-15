import React, { useState } from 'react';
import { X, Play, Clock, Sparkles, Filter, AlertTriangle, Layers, BookOpen } from 'lucide-react';
import { ExamSimulatorMode, ExamSourceFilter, ExamSessionConfig } from '../types/study';

interface ExamSimulatorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTopics: string[];
  courseCode: string;
  hasMistakes: boolean;
  onStartExam: (config: ExamSessionConfig) => void;
  initialTopic?: string | null;
}

export const ExamSimulatorConfigModal: React.FC<ExamSimulatorConfigModalProps> = ({
  isOpen,
  onClose,
  availableTopics,
  courseCode,
  hasMistakes,
  onStartExam,
  initialTopic,
}) => {
  const [mode, setMode] = useState<ExamSimulatorMode>('strict');
  const [sourceFilter, setSourceFilter] = useState<ExamSourceFilter>('hybrid');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(45);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    initialTopic ? [initialTopic] : availableTopics
  );
  const [questionCount, setQuestionCount] = useState(6);

  if (!isOpen) return null;

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleLaunch = () => {
    onStartExam({
      course_id: courseCode.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      title: `${courseCode} Practice Simulator (${mode === 'strict' ? 'Strict Timed' : 'Tutor Mode'})`,
      mode,
      source_filter: sourceFilter,
      time_limit_minutes: timeLimitMinutes,
      selected_topics: selectedTopics.length > 0 ? selectedTopics : availableTopics,
      question_count: questionCount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 my-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Module 3 · Exam Intelligence Simulator</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Configure Practice Test Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Customize testing conditions for {courseCode}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Simulator Mode */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Select Test Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('strict')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'strict'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                  : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Strict Exam Mode</span>
                <Clock className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Realistic exam condition: strict countdown, no hints, locked answers until final submission.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('tutor')}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === 'tutor'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                  : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">Tutor Mode</span>
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Formative review: instant rubric evaluation, hints, and explanations revealed after each question.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Source Filter */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            2. Question Source Filter
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'past_exams_only', label: 'Past Exams Only' },
              { id: 'hybrid', label: 'Hybrid (50/50)' },
              { id: 'ai_generated_only', label: 'AI Generated' },
              { id: 'mistake_review', label: 'Mistake Review' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSourceFilter(s.id as any)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  sourceFilter === s.id
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {sourceFilter === 'mistake_review' && !hasMistakes && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1.5 pt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>No recorded mistakes yet. Past exam questions will be loaded.</span>
            </p>
          )}
        </div>

        {/* 3. Duration & Question Count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Time Limit (Minutes)
            </label>
            <select
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="15">15 Minutes (Sprint Quiz)</option>
              <option value="30">30 Minutes (Midterm Section)</option>
              <option value="45">45 Minutes (Standard Practice)</option>
              <option value="60">60 Minutes (Full Exam Simulation)</option>
              <option value="90">90 Minutes (Comprehensive Final)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Question Count
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="4">4 Questions (Targeted Drill)</option>
              <option value="6">6 Questions (Standard Exam)</option>
              <option value="8">8 Questions (Extended Exam)</option>
              <option value="12">12 Questions (Full Past Paper)</option>
            </select>
          </div>
        </div>

        {/* 4. Target Topics */}
        {availableTopics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Target Topics ({selectedTopics.length} selected)
              </label>
              <button
                type="button"
                onClick={() =>
                  setSelectedTopics(
                    selectedTopics.length === availableTopics.length ? [] : availableTopics
                  )
                }
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
              >
                {selectedTopics.length === availableTopics.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950/80 rounded-xl border border-slate-800">
              {availableTopics.map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-medium'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Exam Simulator</span>
          </button>
        </div>
      </div>
    </div>
  );
};
