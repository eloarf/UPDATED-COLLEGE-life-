import React from 'react';
import {
  Battery,
  Smartphone,
  Laptop,
  Sparkles,
  ShieldAlert,
  Target,
  Edit3,
  Clock,
} from 'lucide-react';
import { AppSettings, Exam } from '../../types';
import {
  formatDisplayDate,
  getEthiopicDateString,
  getTimeGreeting,
} from '../../utils/dateUtils';

interface LobbyHeroHeaderProps {
  todayKey: string;
  settings: AppSettings | undefined;
  lowEnergy: boolean;
  toggleLowEnergy: () => void;
  isDormDay: boolean;
  toggleDormDay: () => void;
  nextExam: Exam | undefined;
  isEditingIntention: boolean;
  setIsEditingIntention: (val: boolean) => void;
  intentionInput: string;
  setIntentionInput: (val: string) => void;
  handleSaveIntention: () => void;
  onNavigate: (route: string) => void;
}

export const LobbyHeroHeader: React.FC<LobbyHeroHeaderProps> = ({
  todayKey,
  settings,
  lowEnergy,
  toggleLowEnergy,
  isDormDay,
  toggleDormDay,
  nextExam,
  isEditingIntention,
  setIsEditingIntention,
  intentionInput,
  setIntentionInput,
  handleSaveIntention,
  onNavigate,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--c-muted))]">
          <span className="font-semibold text-[rgb(var(--c-text))]">{formatDisplayDate(todayKey)}</span>
          <span>·</span>
          <span>{getEthiopicDateString()}</span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={toggleLowEnergy}
            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              lowEnergy
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-400'
                : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
            title="Toggle Low Energy Mode (shows priority tasks only)"
          >
            <Battery className="w-3.5 h-3.5" />
            <span>{lowEnergy ? 'Low Energy: On' : 'Low Energy'}</span>
          </button>

          <button
            onClick={toggleDormDay}
            className="min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-bold border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition flex items-center gap-1.5 cursor-pointer"
            title="Toggle view between Dorm/Phone and Desk/PC mode"
          >
            {isDormDay ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
            <span>{isDormDay ? 'Dorm Mode' : 'Desk Mode'}</span>
          </button>

          <button
            onClick={() => onNavigate('#/today')}
            className="min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-bold border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] transition flex items-center gap-1.5 cursor-pointer"
            title="Open 06:00-23:00 Day Timeline & Rituals"
          >
            <Clock className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => onNavigate('#/statistics')}
            className="min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition flex items-center gap-1 cursor-pointer"
            title="View Statistics & Analytics"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Stats</span>
          </button>
        </div>
      </div>

      {/* Greeting & Imminent Exam */}
      <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
            {getTimeGreeting(settings?.userName || 'Scholar')}
          </h1>
          <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
            {settings?.universityName || 'Addis Ababa Science & Technology University'} · {settings?.currentTermName || 'Semester'}
          </p>
        </div>

        {nextExam && (
          <button
            onClick={() => onNavigate('#/exams')}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-heading font-bold self-start sm:self-auto hover:bg-rose-500/20 transition cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Next Exam: {nextExam.title} ({formatDisplayDate(nextExam.examDate)})</span>
          </button>
        )}
      </div>

      {/* Daily Focus Intention */}
      <div className="mt-3.5 p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Target className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0" />
          {isEditingIntention ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={intentionInput}
                onChange={(e) => setIntentionInput(e.target.value)}
                placeholder="What is your primary focus for today?"
                className="min-h-[36px] w-full px-2.5 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveIntention()}
              />
              <button
                onClick={handleSaveIntention}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-600 text-white font-heading font-bold text-xs shrink-0 cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] mr-1.5">
                Today's Focus:
              </span>
              <span className="text-[rgb(var(--c-text))] font-medium">
                {intentionInput || 'Tap "Set Focus" to anchor your primary goal for today...'}
              </span>
            </div>
          )}
        </div>

        {!isEditingIntention && (
          <button
            onClick={() => setIsEditingIntention(true)}
            className="text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] flex items-center gap-1 shrink-0 self-end sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
            <span>{intentionInput ? 'Edit' : 'Set Focus'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
