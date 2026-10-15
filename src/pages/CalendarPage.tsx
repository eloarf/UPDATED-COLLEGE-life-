import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  getTodayKey,
  formatDisplayDate,
  parseDayKey,
  getEthiopicDateString,
  DAY_NAMES,
} from '../utils/dateUtils';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  CheckSquare,
  Layers,
  MapPin,
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const milestones = useLiveQuery(() => db.projectMilestones.toArray()) || [];

  // Compute month days
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Month header text
  const monthTitle = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Starting offset: 0=Mon, ... 6=Sun
  const startDay = (firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1);
  const totalDays = lastDayOfMonth.getDate();

  const dayCells = [];
  for (let i = 0; i < startDay; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayCells.push(dStr);
  }

  // Items for selected day
  const dayTasks = tasks.filter((t) => t.dueDate === selectedDayKey);
  const dayExams = exams.filter((e) => e.examDate === selectedDayKey);
  const dayMilestones = milestones.filter((m) => m.dueDate === selectedDayKey);

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#BBA6E0] font-bold">
              Integrated Calendar Matrix
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Monthly Agenda &amp; Milestones
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {getEthiopicDateString(currentMonthDate)} • Unified classes, deadlines &amp; boss battles
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-full border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-heading font-bold px-3 py-1 rounded-xl bg-[rgb(var(--c-surface2))]">
              {monthTitle}
            </span>
            <button
              onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-full border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Calendar Grid */}
        <div className="mt-4">
          <div className="grid grid-cols-7 text-center font-heading text-[10px] uppercase tracking-wider text-[rgb(var(--c-muted))] font-bold pb-2 border-b border-[rgb(var(--c-border))]">
            {DAY_NAMES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 pt-2">
            {dayCells.map((dayKey, idx) => {
              if (!dayKey) {
                return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
              }

              const isToday = dayKey === todayKey;
              const isSelected = dayKey === selectedDayKey;
              const hasTask = tasks.some((t) => t.dueDate === dayKey);
              const hasExam = exams.some((e) => e.examDate === dayKey);
              const dayNum = parseInt(dayKey.slice(8), 10);

              return (
                <button
                  key={dayKey}
                  onClick={() => setSelectedDayKey(dayKey)}
                  className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-between p-1 transition active:scale-95 border ${
                    isSelected
                      ? 'border-[#BBA6E0] bg-[#BBA6E0] text-stone-950 font-bold shadow-xs'
                      : isToday
                      ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] font-bold text-[rgb(var(--c-primary))]'
                      : 'border-transparent hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))]'
                  }`}
                >
                  <span className="text-xs">{dayNum}</span>
                  <div className="flex items-center gap-0.5">
                    {hasExam && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                    {hasTask && <span className="w-1.5 h-1.5 rounded-full bg-[#B6E63E]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Agenda */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
            Agenda for {formatDisplayDate(selectedDayKey)}
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
            {dayTasks.length + dayExams.length + dayMilestones.length} events
          </div>
        </div>

        {dayTasks.length === 0 && dayExams.length === 0 && dayMilestones.length === 0 ? (
          <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
            No deadlines or exams logged on this date.
          </div>
        ) : (
          <div className="space-y-2">
            {dayExams.map((e) => (
              <div
                key={e.id}
                onClick={() => setCurrentRoute('#/exams')}
                className="p-3 rounded-xl border border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-[rgb(var(--c-text))]">{e.title}</span>
                </div>
                <span className="text-[10px] font-heading font-bold text-rose-600">
                  {e.startTime} ({e.hall || 'TBA'})
                </span>
              </div>
            ))}

            {dayTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setCurrentRoute('#/tasks')}
                className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                  <span className={`text-xs ${t.status === 'done' ? 'line-through text-[rgb(var(--c-muted))]' : 'font-semibold text-[rgb(var(--c-text))]'}`}>
                    {t.title}
                  </span>
                </div>
                {t.dueTime && (
                  <span className="text-[10px] text-[rgb(var(--c-muted))]">Due {t.dueTime}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
