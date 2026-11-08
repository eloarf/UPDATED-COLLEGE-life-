import React from 'react';
import { Flame } from 'lucide-react';
import { formatMinutes } from '../../utils/dateUtils';

interface FocusStatsSummaryBarProps {
  dailyMinutes: number;
  totalCompletedSessions: number;
  currentStreakDays: number;
}

export const FocusStatsSummaryBar: React.FC<FocusStatsSummaryBarProps> = ({
  dailyMinutes,
  totalCompletedSessions,
  currentStreakDays,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] text-center">
        <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">Today's Focus</div>
        <div className="text-base font-heading font-bold text-[#B6E63E] mt-0.5">
          {formatMinutes(dailyMinutes)}
        </div>
      </div>
      <div className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] text-center">
        <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">Sessions Done</div>
        <div className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
          {totalCompletedSessions}
        </div>
      </div>
      <div className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] text-center">
        <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] flex items-center justify-center gap-1">
          <Flame className="w-3 h-3 text-amber-500" />
          <span>Streak</span>
        </div>
        <div className="text-base font-heading font-bold text-amber-500 mt-0.5">
          {currentStreakDays} {currentStreakDays === 1 ? 'day' : 'days'}
        </div>
      </div>
    </div>
  );
};
