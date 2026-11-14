import React from 'react';
import { HotelProgressState } from '../../utils/hotelProgressEngine';
import { Building2, Sparkles } from 'lucide-react';

interface LobbyHotelProgressCardProps {
  progress: HotelProgressState;
}

export const LobbyHotelProgressCard: React.FC<LobbyHotelProgressCardProps> = ({
  progress,
}) => {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-stone-950 font-heading font-bold shadow-2xs"
            style={{ backgroundColor: progress.currentWing.accentColor }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-[rgb(var(--c-primary))]">
              Wing {progress.unlockedCount} of {progress.totalWings} • Floor {progress.currentWing.floor}
            </div>
            <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] truncate">
              {progress.currentWing.name}
            </div>
            <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish truncate">
              {progress.currentWing.subtitle}
            </div>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            {progress.consistentDays} consistent {progress.consistentDays === 1 ? 'day' : 'days'}
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
            Habits, mini wins &amp; rest tokens all count
          </div>
        </div>
      </div>

      {/* Wing Blueprint Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {progress.wings.map((w) => (
          <div
            key={w.id}
            title={`Floor ${w.floor}: ${w.name} (${w.requiredDays}d)`}
            className={`p-2 rounded-lg border text-center transition ${
              w.isUnlocked
                ? 'border-[rgb(var(--c-primary))]/60 bg-[rgb(var(--c-surface2))]'
                : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] opacity-60'
            }`}
          >
            <div className="text-[9px] font-heading font-bold text-[rgb(var(--c-muted))]">
              F{w.floor}
            </div>
            <div
              className="w-2.5 h-2.5 rounded-full mx-auto mt-1"
              style={{
                backgroundColor: w.isUnlocked ? w.accentColor : 'rgb(var(--c-border))',
              }}
            />
          </div>
        ))}
      </div>

      {progress.nextWing && (
        <div className="flex items-center justify-between text-[11px] text-[rgb(var(--c-muted))] font-flourish">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>
              Next wing: <strong className="text-[rgb(var(--c-text))]">{progress.nextWing.name}</strong> ({progress.nextWing.requiredDays}d &amp; {progress.nextWing.requiredXp} XP)
            </span>
          </span>
          <span className="font-heading font-bold text-[rgb(var(--c-primary))]">
            {progress.nextWing.progressPercent}%
          </span>
        </div>
      )}
    </div>
  );
};
