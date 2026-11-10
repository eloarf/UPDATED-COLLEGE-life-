import React, { useState, useEffect } from 'react';
import { minutesToTimeString } from '../../utils/timelineEngine';
import { getTodayKey } from '../../utils/dateUtils';

export interface NowIndicatorProps {
  dayStartMinutes?: number; // default 360 (06:00)
  dayEndMinutes?: number;   // default 1380 (23:00)
  totalHeightPx?: number;
  dateKey?: string;
}

export const NowIndicator: React.FC<NowIndicatorProps> = ({
  dayStartMinutes = 360,
  dayEndMinutes = 1380,
  totalHeightPx,
  dateKey,
}) => {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setCurrentMinutes(d.getHours() * 60 + d.getMinutes());
    };
    // Update every 30 seconds
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Only render if viewing today
  if (dateKey && dateKey !== getTodayKey()) {
    return null;
  }

  const totalRange = dayEndMinutes - dayStartMinutes;
  if (totalRange <= 0) return null;

  // If now is before 06:00 or after 23:00, clamp or hide
  if (currentMinutes < dayStartMinutes || currentMinutes > dayEndMinutes) {
    return null;
  }

  const offsetMinutes = currentMinutes - dayStartMinutes;
  const timeString = minutesToTimeString(currentMinutes);

  const stylePosition = totalHeightPx
    ? { top: `${(offsetMinutes / totalRange) * totalHeightPx}px` }
    : { top: `${(offsetMinutes / totalRange) * 100}%` };

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center transition-all duration-500 ease-out"
      style={stylePosition}
      aria-label={`Current time: ${timeString}`}
    >
      {/* Time pill badge */}
      <div className="bg-rose-500 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-md ml-0 sm:ml-1 shrink-0 flex items-center space-x-1">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span>{timeString}</span>
      </div>
      {/* Horizontal glowing red line across timeline */}
      <div className="flex-1 h-[2px] bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
    </div>
  );
};
