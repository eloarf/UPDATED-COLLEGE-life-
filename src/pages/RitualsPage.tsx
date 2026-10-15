import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { triggerBackupDownload } from '../services/backupService';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { getTodayKey } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';
import {
  RefreshCw,
  CheckCircle,
  Sparkles,
  Download,
  Calendar,
  Award,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export const RitualsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [activeRitual, setActiveRitual] = useState<'weekly' | 'monthly' | null>(null);

  // Weekly review wizard steps
  const [weeklyStep, setWeeklyStep] = useState(1);
  const [winText, setWinText] = useState('');
  const [fixText, setFixText] = useState('');

  // Monthly reset wizard
  const [monthlyStep, setMonthlyStep] = useState(1);
  const [resetRewardText, setResetRewardText] = useState('');

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const doneThisWeek = tasks.filter((t) => t.status === 'done').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'done').length;

  const handleFinishWeeklyReview = async () => {
    const runId = generateId();
    await db.ritualRuns.add({
      id: runId,
      type: 'weekly_review',
      date: getTodayKey(),
      answers: { win: winText, fix: fixText },
      isCompleted: true,
    });

    triggerLevelUpConfetti();
    await awardXp({
      source: 'weekly_review',
      sourceId: runId,
      amount: 60,
      stat: 'discipline',
    });

    showToast('🎉 Weekly Review complete! +60 Discipline XP awarded!', 'success');
    setActiveRitual(null);
    setWeeklyStep(1);
  };

  const handleFinishMonthlyReset = async () => {
    const runId = generateId();
    await db.ritualRuns.add({
      id: runId,
      type: 'monthly_reset',
      date: getTodayKey(),
      answers: { reward: resetRewardText },
      isCompleted: true,
    });

    triggerLevelUpConfetti();
    await awardXp({
      source: 'monthly_reset',
      sourceId: runId,
      amount: 150,
      stat: 'discipline',
    });

    showToast('🏆 Monthly Reset Day Ritual completed! Clean slate & +150 XP!', 'success');
    setActiveRitual(null);
    setMonthlyStep(1);
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div>
          <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
            Deliberate Alignment Ceremonies
          </div>
          <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
            University Rituals &amp; Reset Days
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Sunday Weekly Review (60 XP) • Post-Exam Monthly Reset Day (150 XP)
          </p>
        </div>
      </div>

      {/* Ritual Cards Selection */}
      {!activeRitual && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Weekly Review */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase text-[rgb(var(--c-primary))]">
                <RefreshCw className="w-4 h-4" />
                <span>Sunday Weekly Review</span>
              </div>
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                Reflect, Clear &amp; Map Next Week
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                Audit what got done, forgive and roll over leftovers, identify one win and one adjustment.
              </p>
            </div>

            <button
              onClick={() => setActiveRitual('weekly')}
              className="w-full mt-3 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Begin Weekly Review (+60 XP)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Monthly Reset Day */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Post-Exam Monthly Reset Day</span>
              </div>
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                The Sacred Clean Slate Ceremony
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                Export safety backup, empty inbox, check CGPA progress, tidy study desk, and reward yourself.
              </p>
            </div>

            <button
              onClick={() => setActiveRitual('monthly')}
              className="w-full mt-3 py-2 rounded-xl bg-amber-500 text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Commence Monthly Reset (+150 XP)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Guided Wizard: Weekly Review */}
      {activeRitual === 'weekly' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <span className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] uppercase">
              Weekly Review — Step {weeklyStep} of 3
            </span>
            <button
              onClick={() => setActiveRitual(null)}
              className="text-xs text-[rgb(var(--c-muted))] hover:underline"
            >
              Exit Ritual
            </button>
          </div>

          {weeklyStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                1. Inspect Momentum &amp; Leftovers
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                  <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))]">
                    Quests Conquered
                  </span>
                  <div className="text-lg font-heading font-bold text-emerald-600">
                    {doneThisWeek} Completed
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                  <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))]">
                    Pending / Rolled Over
                  </span>
                  <div className="text-lg font-heading font-bold text-amber-600">
                    {pendingTasks} In Flight
                  </div>
                </div>
              </div>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                “Forgive what did not happen. University progress is iterative, not punitive.”
              </p>
              <button
                onClick={() => setWeeklyStep(2)}
                className="w-full py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold"
              >
                Proceed to Reflection →
              </button>
            </div>
          )}

          {weeklyStep === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                2. Identify One Win and One Fix
              </h3>
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  What was your biggest win or proudest moment this week?
                </label>
                <input
                  type="text"
                  value={winText}
                  onChange={(e) => setWinText(e.target.value)}
                  placeholder="e.g. Mastered derivatives in calculus tutorial"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  What is one thing you will tweak or adjust for next week?
                </label>
                <input
                  type="text"
                  value={fixText}
                  onChange={(e) => setFixText(e.target.value)}
                  placeholder="e.g. Go to bed 30 minutes earlier on Thursday"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
              <button
                onClick={() => setWeeklyStep(3)}
                className="w-full py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold"
              >
                Seal Review →
              </button>
            </div>
          )}

          {weeklyStep === 3 && (
            <div className="space-y-3 text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                You Are Prepared for the Coming Week
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-sm mx-auto">
                Win logged: “{winText || 'Consistent effort'}” • Adjustment: “{fixText || 'Keep momentum'}”
              </p>
              <button
                onClick={handleFinishWeeklyReview}
                className="px-6 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
              >
                Claim +60 Discipline XP &amp; Conclude
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guided Wizard: Monthly Reset */}
      {activeRitual === 'monthly' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <span className="text-xs font-heading font-bold text-amber-600 uppercase">
              Monthly Reset Ceremony — Step {monthlyStep} of 3
            </span>
            <button
              onClick={() => setActiveRitual(null)}
              className="text-xs text-[rgb(var(--c-muted))] hover:underline"
            >
              Exit Ritual
            </button>
          </div>

          {monthlyStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                1. Take a Monthly Data Safety Snapshot
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                Ensure your entire semester of courses, notes, and XP is backed up to your device as a JSON file.
              </p>
              <button
                onClick={async () => {
                  await triggerBackupDownload();
                  showToast('Safety backup downloaded!', 'success');
                }}
                className="w-full py-2 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-heading text-xs font-bold flex items-center justify-center gap-2 hover:bg-[rgb(var(--c-primary))] hover:text-white"
              >
                <Download className="w-4 h-4" />
                <span>Export Safety Snapshot JSON</span>
              </button>
              <button
                onClick={() => setMonthlyStep(2)}
                className="w-full py-2 rounded-xl bg-amber-500 text-stone-950 font-heading text-xs font-bold"
              >
                Backup Secured, Proceed →
              </button>
            </div>
          )}

          {monthlyStep === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                2. Academic Audit &amp; Desk Refresh
              </h3>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-amber-500" />
                  <span>Reviewed grades and GPA placement trajectory (Target: 3.85)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-amber-500" />
                  <span>Cleaned up download folders and lecture PDF printouts</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  How will you treat / reward yourself for surviving this month?
                </label>
                <input
                  type="text"
                  value={resetRewardText}
                  onChange={(e) => setResetRewardText(e.target.value)}
                  placeholder="e.g. Traditional Ethiopian coffee ceremony + favorite meal"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
              <button
                onClick={() => setMonthlyStep(3)}
                className="w-full py-2 rounded-xl bg-amber-500 text-stone-950 font-heading text-xs font-bold"
              >
                Conclude Reset →
              </button>
            </div>
          )}

          {monthlyStep === 3 && (
            <div className="space-y-3 text-center py-4">
              <Sparkles className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                The Slate is Spotless
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                Reward chosen: “{resetRewardText || 'A great rest and cup of coffee'}”
              </p>
              <button
                onClick={handleFinishMonthlyReset}
                className="px-6 py-2 rounded-xl bg-amber-500 text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90"
              >
                Seal Clean Slate &amp; Claim +150 XP
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
