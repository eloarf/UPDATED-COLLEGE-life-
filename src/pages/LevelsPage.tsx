import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  calculateLevelFromTotalXp,
  getAllLevelThresholds,
  reconcileXpLedger,
  INITIAL_ACHIEVEMENTS,
  LevelThreshold,
} from '../services/rpgService';
import {
  Award,
  Shield,
  Zap,
  Sparkles,
  Lock,
  CheckCircle,
  ShieldCheck,
  ChevronRight,
  Flame,
  BookOpen,
  Filter,
  History,
  TrendingUp,
} from 'lucide-react';

export const LevelsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray()) || [];
  const achievements = useLiveQuery(() => db.achievementsUnlocked.toArray()) || INITIAL_ACHIEVEMENTS;

  const totalXp = Math.max(0, xpEvents.reduce((acc, curr) => acc + (curr.amount || 0), 0));
  const heroInfo = calculateLevelFromTotalXp(totalXp);
  const allLevels = getAllLevelThresholds();

  const [activeTab, setActiveTab] = useState<'progression' | 'attributes' | 'history'>('progression');
  const [progressionFilter, setProgressionFilter] = useState<'all' | 'current_family' | 'unlocked' | 'upcoming'>('all');
  const [isReconciling, setIsReconciling] = useState(false);

  // Reconcile XP Ledger
  const handleReconcile = async () => {
    setIsReconciling(true);
    try {
      const result = await reconcileXpLedger();
      if (result.reversedCount > 0) {
        showToast(
          `Reconciled: removed ${result.reversedCount} orphaned/duplicate XP records. Verified total: ${result.reconciledTotalXp} XP.`,
          'success'
        );
      } else {
        showToast(
          `XP Ledger pristine! All ${result.totalValidEvents} events verified (${result.reconciledTotalXp} total XP).`,
          'info'
        );
      }
    } finally {
      setIsReconciling(false);
    }
  };

  // Filtered levels list
  const filteredLevels = allLevels.filter((lvl) => {
    if (progressionFilter === 'current_family') {
      return lvl.rankFamily === heroInfo.rankFamily;
    }
    if (progressionFilter === 'unlocked') {
      return lvl.level <= heroInfo.level;
    }
    if (progressionFilter === 'upcoming') {
      return lvl.level > heroInfo.level;
    }
    return true;
  });

  // 5 Stats computation
  const knowledgeXp = xpEvents.filter((e) => e.stat === 'knowledge').reduce((acc, curr) => acc + curr.amount, 0);
  const disciplineXp = xpEvents.filter((e) => e.stat === 'discipline').reduce((acc, curr) => acc + curr.amount, 0);
  const vitalityXp = xpEvents.filter((e) => e.stat === 'vitality').reduce((acc, curr) => acc + curr.amount, 0);
  const creativityXp = xpEvents.filter((e) => e.stat === 'creativity').reduce((acc, curr) => acc + curr.amount, 0);
  const teamworkXp = xpEvents.filter((e) => e.stat === 'teamwork').reduce((acc, curr) => acc + curr.amount, 0);

  const getStatLevel = (xp: number) => Math.min(20, Math.floor(xp / 100) + 1);

  const stats = [
    { name: 'Knowledge', level: getStatLevel(knowledgeXp), xp: knowledgeXp, desc: 'Lectures, focus minutes & exam mastery', color: '#B6E63E' },
    { name: 'Discipline', level: getStatLevel(disciplineXp), xp: disciplineXp, desc: 'On-time assignments & routine execution', color: '#7A2E4A' },
    { name: 'Vitality', level: getStatLevel(vitalityXp), xp: vitalityXp, desc: 'Workouts, hydration & restorative sleep', color: '#4FA3A5' },
    { name: 'Creativity', level: getStatLevel(creativityXp), xp: creativityXp, desc: 'Music production, studio flow & journal', color: '#BBA6E0' },
    { name: 'Teamwork', level: getStatLevel(teamworkXp), xp: teamworkXp, desc: 'Project milestones & group deliverables', color: '#E5C04B' },
  ];

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const xpRemainingToNext = heroInfo.isMaxLevel ? 0 : Math.max(0, heroInfo.xpNeededForNext - heroInfo.currentLevelXp);

  return (
    <div className="space-y-6 pb-24 animate-pop">
      {/* Top Hero Rank Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xs">
        {/* Storybook flourish watermark */}
        <div className="absolute top-3 left-4 text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
          University Registry of Ranks • Level 1 to 50
        </div>
        <div className="absolute top-3 right-4">
          <button
            onClick={handleReconcile}
            disabled={isReconciling}
            className="px-2.5 py-1 rounded-full text-[10px] font-heading font-bold border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[#7A2E4A] transition flex items-center gap-1 shadow-2xs"
            title="Verify and reconcile XP ledger integrity against all completed tasks"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>{isReconciling ? 'Auditing...' : 'Verify XP Ledger'}</span>
          </button>
        </div>

        {/* Level Emblem */}
        <div className="mt-5 w-24 h-24 mx-auto rounded-3xl bg-[rgb(var(--c-surface2))] border-2 border-[rgb(var(--c-primary))] flex flex-col items-center justify-center shadow-md relative">
          <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-primary))]">
            Level
          </span>
          <span className="font-heading text-3xl font-bold text-[rgb(var(--c-text))] leading-none">
            {heroInfo.level}
          </span>
          <div className="text-[9px] font-heading font-semibold text-[rgb(var(--c-muted))] mt-0.5">
            {heroInfo.rankFamily}
          </div>
        </div>

        {/* Rank Titles */}
        <div className="mt-3">
          <div className="text-[11px] uppercase font-heading font-bold tracking-widest text-[rgb(var(--c-primary))]">
            {heroInfo.rankFamily} Family • Tier {heroInfo.rankTier}
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
            {heroInfo.title}
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
            "{heroInfo.subtitle}"
          </p>
          <div className="inline-block mt-2 px-3 py-1 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-xs font-heading">
            Total Accumulated Experience:{' '}
            <span className="font-bold text-[rgb(var(--c-xp))]">{totalXp.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Progress Bar to Next Level */}
        <div className="mt-5 max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-heading font-bold">
            <span className="text-[rgb(var(--c-primary))]">
              {heroInfo.isMaxLevel ? 'Apex Rank Achieved' : `Progress to Next Rank (${heroInfo.nextRankTitle})`}
            </span>
            <span className="text-[rgb(var(--c-muted))]">
              {heroInfo.currentLevelXp.toLocaleString()} / {heroInfo.xpNeededForNext.toLocaleString()} XP ({heroInfo.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3.5 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden p-0.5 border border-[rgb(var(--c-border))] shadow-inner">
            <div
              className="h-full bg-[rgb(var(--c-xp))] rounded-full transition-all duration-500"
              style={{ width: `${heroInfo.progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            <span>Level {heroInfo.level} Start</span>
            {!heroInfo.isMaxLevel && (
              <span className="font-semibold text-[rgb(var(--c-text))]">
                {xpRemainingToNext.toLocaleString()} XP needed to level up
              </span>
            )}
            <span>Level {Math.min(50, heroInfo.level + 1)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgb(var(--c-border))] pb-2 overflow-x-auto scrollbar-none">
        {[
          { key: 'progression', label: 'Ranks & Progression (50 Levels)', icon: Award },
          { key: 'attributes', label: 'Core Attributes & Badges', icon: Shield },
          { key: 'history', label: `XP Ledger History (${xpEvents.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-2xl font-heading text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-[#7A2E4A] text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Ranks & Full Progression Roadmap */}
      {activeTab === 'progression' && (
        <div className="space-y-4">
          {/* Sub-filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs">
            <div className="flex items-center gap-1.5 font-heading font-bold text-[rgb(var(--c-text))]">
              <Filter className="w-3.5 h-3.5 text-[#7A2E4A]" />
              <span>Filter Roadmap:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'All 50 Levels' },
                { key: 'current_family', label: `Current: ${heroInfo.rankFamily}` },
                { key: 'unlocked', label: 'Unlocked' },
                { key: 'upcoming', label: 'Upcoming Ranks' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setProgressionFilter(f.key as any)}
                  className={`px-3 py-1 rounded-xl font-heading text-xs transition ${
                    progressionFilter === f.key
                      ? 'bg-[rgb(var(--c-primary))] text-white font-bold shadow-2xs'
                      : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLevels.map((lvl) => {
              const isCurrent = lvl.level === heroInfo.level;
              const isUnlocked = lvl.level < heroInfo.level;
              const isLocked = lvl.level > heroInfo.level;
              const xpNeededFromNow = Math.max(0, lvl.cumulativeXp - totalXp);

              return (
                <div
                  key={lvl.level}
                  className={`ticket-cutout ticket-border rounded-2xl p-4 transition-all relative ${
                    isCurrent
                      ? 'border-2 border-[#7A2E4A] bg-[#7A2E4A]/10 shadow-md ring-2 ring-[#7A2E4A]/25'
                      : isUnlocked
                      ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/15'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 font-heading text-sm font-bold shadow-2xs ${
                          isCurrent
                            ? 'bg-[#7A2E4A] text-white'
                            : isUnlocked
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] border border-[rgb(var(--c-border))]'
                        }`}
                      >
                        <span className="text-[9px] uppercase leading-none opacity-80">Lv</span>
                        <span className="leading-none mt-0.5">{lvl.level}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                            {lvl.rankTitle}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-[#7A2E4A] text-white font-heading text-[9px] font-bold shadow-2xs animate-pulse">
                              CURRENT RANK
                            </span>
                          )}
                          {isUnlocked && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-heading text-[9px] font-bold">
                              MASTERED ✓
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                          {lvl.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))]">
                        Req: {lvl.cumulativeXp.toLocaleString()} XP
                      </div>
                      {isLocked && (
                        <div className="text-[9px] text-rose-500 font-medium mt-0.5 flex items-center justify-end gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>+{xpNeededFromNow.toLocaleString()} XP</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Core Attributes & Badges */}
      {activeTab === 'attributes' && (
        <div className="space-y-6">
          {/* 5 Core Attributes */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
              5 Core University Attributes (Rank 1–20)
            </div>

            <div className="space-y-3.5">
              {stats.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-heading font-bold">
                    <span className="text-[rgb(var(--c-text))] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name} (Rank {s.level})</span>
                    </span>
                    <span className="text-[rgb(var(--c-muted))]">{s.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="w-full h-2.5 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden border border-[rgb(var(--c-border))]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: s.color,
                        width: `${Math.min(100, (s.level / 20) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges & Achievements */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))]">
                Medals &amp; Milestone Badges
              </div>
              <span className="text-xs font-heading font-bold text-[rgb(var(--c-primary))]">
                {unlockedCount} of {achievements.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                    a.isUnlocked
                      ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] opacity-60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      a.isUnlocked ? 'bg-emerald-500 text-white shadow-2xs' : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]'
                    }`}
                  >
                    {a.isUnlocked ? <Award className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {a.title}
                    </div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))] leading-tight mt-0.5 font-flourish">
                      {a.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: XP Ledger History */}
      {activeTab === 'history' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div>
              <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))]">
                Append-Only Experience Ledger
              </div>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                Receipts generated on confirmed task conquer, focus flow, and habit check-ins.
              </p>
            </div>
            <button
              onClick={handleReconcile}
              className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))]"
            >
              Reconcile
            </button>
          </div>

          {xpEvents.length === 0 ? (
            <div className="text-center py-10 text-xs text-[rgb(var(--c-muted))] font-flourish">
              No XP receipts recorded yet. Complete your first assignment or daily quest!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {[...xpEvents].reverse().map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs"
                >
                  <div>
                    <span className="font-heading font-bold text-[rgb(var(--c-text))] capitalize">
                      {e.source.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[rgb(var(--c-muted))] ml-2">
                      {e.dayKey} • {e.stat}
                    </span>
                  </div>
                  <span className="font-heading font-bold text-[rgb(var(--c-xp))]">
                    +{e.amount} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
