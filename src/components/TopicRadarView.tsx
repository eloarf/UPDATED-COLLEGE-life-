import React, { useState } from 'react';
import { TopicRadarAnalysis, ExamQuestion } from '../types/study';
import {
  Radar,
  TrendingUp,
  AlertCircle,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  Target,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface TopicRadarViewProps {
  radarData: TopicRadarAnalysis;
  questions: ExamQuestion[];
  onLaunchSimulatorWithTopic: (topic: string) => void;
  onRefreshRadar: () => void;
  isRefreshing?: boolean;
}

export const TopicRadarView: React.FC<TopicRadarViewProps> = ({
  radarData,
  questions,
  onLaunchSimulatorWithTopic,
  onRefreshRadar,
  isRefreshing,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(
    radarData.weight_matrix[0]?.topic || null
  );

  const activeTopicItem = radarData.weight_matrix.find((t) => t.topic === selectedTopic) || radarData.weight_matrix[0];
  const topicQuestions = questions.filter((q) => q.topic_tag === activeTopicItem?.topic);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <Radar className="w-4 h-4" />
            <span>Module 2 · Pattern Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
            High-Yield Topic & Exam Pattern Radar
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Statistical regression across {radarData.total_exams_analyzed} past papers ({radarData.year_range}). Identifies repeating question patterns and weights to prioritize high-yield revision.
          </p>
        </div>

        <button
          onClick={onRefreshRadar}
          disabled={isRefreshing}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-sm shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isRefreshing ? 'Analyzing Past Papers...' : 'Re-Run Pattern Radar'}</span>
        </button>
      </div>

      {/* Executive Strategic Summary Box */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl flex items-start gap-3.5 shadow-lg">
        <Target className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <strong className="text-indigo-300 font-bold block">
            Professor Examination Pattern & Executive Takeaway:
          </strong>
          <p className="text-slate-200 leading-relaxed">
            {radarData.executive_takeaway}
          </p>
        </div>
      </div>

      {/* Grid: Exam Weight Matrix & Predicted Focus Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Exam Weight Matrix (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Historical Exam Weight Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Frequency of appearance and historical point percentage across past finals.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {radarData.weight_matrix.length} Topics Mapped
            </span>
          </div>

          <div className="space-y-3">
            {radarData.weight_matrix.map((item, idx) => {
              const isSelected = selectedTopic === item.topic;
              const isCritical = item.yield_tier === 'Critical High-Yield';

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedTopic(item.topic)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                  } space-y-3`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {item.yield_tier}
                      </span>
                      <h3 className="text-sm font-bold text-white">{item.topic}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        Exam Points: <strong className="text-white">{item.average_exam_points_pct}%</strong>
                      </span>
                      <span className="text-cyan-400 font-bold">
                        Appears: {item.historical_frequency_pct}%
                      </span>
                    </div>
                  </div>

                  {/* Frequency Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCritical ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${item.historical_frequency_pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Qualitative Recurring Pattern Note */}
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.recurring_pattern}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Past Years:</span>
                      <div className="flex items-center gap-1">
                        {item.years_appeared.map((y) => (
                          <span
                            key={y}
                            className="px-1.5 py-0.2 bg-slate-950 border border-slate-800 text-slate-300 rounded font-mono"
                          >
                            {y}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-indigo-400">
                        Rev. Weight: {item.recommended_revision_weight_pct}%
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunchSimulatorWithTopic(item.topic);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                      >
                        Simulate Questions →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Predicted High-Yield Focus Order & Topic Drilldown */}
        <div className="space-y-6">
          {/* Priority Focus Order Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
                Predicted High-Yield Focus
              </span>
              <h3 className="text-sm font-bold text-white">Study Priority Order</h3>
              <p className="text-xs text-slate-400">
                Ranked by recurrence probability and total mark density.
              </p>
            </div>

            <div className="space-y-2.5">
              {radarData.predicted_focus_order.map((topicName, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedTopic(topicName)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedTopic === topicName
                      ? 'bg-indigo-950/40 border-indigo-500 text-white'
                      : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-indigo-400">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold">{topicName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Priority #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => onLaunchSimulatorWithTopic(activeTopicItem?.topic || '')}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Launch Practice Test for Top Topic</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Topic Sample Past Questions */}
          {activeTopicItem && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <div>
                <span className="text-[11px] font-mono text-slate-500 block uppercase">
                  Archived Past Exam Bank
                </span>
                <h3 className="text-sm font-bold text-white">{activeTopicItem.topic}</h3>
                <p className="text-xs text-slate-400">
                  {topicQuestions.length} real exam questions cataloged
                </p>
              </div>

              <div className="space-y-2.5">
                {topicQuestions.slice(0, 3).map((q) => (
                  <div
                    key={q.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{q.year} {q.exam_type}</span>
                      <span>{q.points} pts</span>
                    </div>
                    <p className="text-slate-300 line-clamp-2">{q.question_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
