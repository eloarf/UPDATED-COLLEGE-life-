import React from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  calculateLevelFromTotalXp,
  INITIAL_ACHIEVEMENTS,
} from '../services/rpgService';
import { formatDisplayDate } from '../utils/dateUtils';
import {
  Award,
  Shield,
  Zap,
  Flame,
  Sparkles,
  BookOpen,
  CheckCircle,
  Users,
  Feather,
  Lock,
  Unlock,
} from 'lucide-react';

export const HeroPage: React.FC = () => {
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray()) || [];
  const achievements = useLiveQuery(() => db.achievementsUnlocked.toArray()) || INITIAL_ACHIEVEMENTS;

  const totalXp = xpEvents.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const heroInfo = calculateLevelFromTotalXp(totalXp);

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

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Grand RPG Character Sheet Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 text-center relative overflow-hidden">
        {/* Storybook badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[rgb(var(--c-surface2))] border-2 border-[rgb(var(--c-primary))] flex items-center justify-center font-heading text-3xl font-bold text-[rgb(var(--c-primary))] shadow-md">
          {heroInfo.level}
        </div>

        <div className="mt-3">
          <div className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-muted))] font-bold">
            Grand Budapest Registry Rank
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
            {settings?.userName || 'Scholar'} — {heroInfo.title}
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Total Accumulated Experience: <span className="font-bold text-[rgb(var(--c-xp))]">{totalXp.toLocaleString()} XP</span>
          </p>
        </div>

        {/* Progress to next level */}
        <div className="mt-4 max-w-sm mx-auto">
          <div className="flex items-center justify-between text-xs font-heading font-bold mb-1">
            <span className="text-[rgb(var(--c-primary))]">Progress to Level {heroInfo.level + 1}</span>
            <span className="text-[rgb(var(--c-muted))]">
              {heroInfo.currentLevelXp} / {heroInfo.xpNeededForNext} XP ({heroInfo.progressPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-[rgb(var(--c-surface2))] rounded-full overflow-hidden p-0.5 border border-[rgb(var(--c-border))]">
            <div
              className="h-full bg-[rgb(var(--c-xp))] rounded-full transition-all duration-500"
              style={{ width: `${heroInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5 Core RPG Stats */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-3">
        <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
          5 Core University Attributes (Lv. 1–20)
        </div>

        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-heading font-bold">
                <span className="text-[rgb(var(--c-text))] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name} (Rank {s.level})
                </span>
                <span className="text-[rgb(var(--c-muted))]">{s.xp} XP</span>
              </div>
              <div className="w-full h-2 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden border border-[rgb(var(--c-border))]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: s.color,
                    width: `${Math.min(100, (s.level / 20) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges & Achievements Vault */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))]">
            Achievements &amp; Medals
          </div>
          <span className="text-xs font-heading font-bold text-[rgb(var(--c-primary))]">
            {unlockedCount} of {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                a.isUnlocked
                  ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] opacity-60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  a.isUnlocked ? 'bg-emerald-500 text-white' : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]'
                }`}
              >
                {a.isUnlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>

              <div>
                <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  {a.title}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))] leading-tight mt-0.5">
                  {a.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Append-Only XP Ledger History */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
        <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
          Append-Only XP Ledger Log ({xpEvents.length} events)
        </div>

        {xpEvents.length === 0 ? (
          <div className="text-center py-6 text-xs text-[rgb(var(--c-muted))] font-flourish">
            No XP events logged yet. Complete tasks, attend lectures, or study syllabus topics to earn experience!
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {[...xpEvents].reverse().slice(0, 20).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-2 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs"
              >
                <div>
                  <span className="font-heading font-bold text-[rgb(var(--c-text))] capitalize">
                    {e.source.replace('_', ' ')}
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
    </div>
  );
};
