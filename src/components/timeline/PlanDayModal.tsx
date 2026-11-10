import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { Task, Habit, DailyPlan } from '../../types';
import { ScheduledClass } from '../../utils/scheduleEngine';
import { generateId } from '../../utils/idGenerator';
import { awardDailyPlanXp } from '../../services/rpgService';
import { useUiStore } from '../../store/uiStore';
import { Sparkles, CheckCircle2, Clock, Calendar, Check, Target, Plus, X } from 'lucide-react';

import { Course } from '../../types';

interface PlanDayModalProps {
  isOpen?: boolean;
  dateKey: string;
  classes: ScheduledClass[];
  courses?: Course[];
  tasks: Task[];
  habits: Habit[];
  onClose: () => void;
  onSaved?: () => void;
  onPlanSaved?: () => void;
}

export const PlanDayModal: React.FC<PlanDayModalProps> = ({
  isOpen = true,
  dateKey,
  classes,
  tasks,
  habits,
  onClose,
  onSaved,
  onPlanSaved,
}) => {
  const { showToast } = useUiStore();
  if (!isOpen) return null;
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [customPriorityText, setCustomPriorityText] = useState('');
  const [customPriorities, setCustomPriorities] = useState<{ id: string; title: string }[]>([]);
  const [note, setNote] = useState('');
  const [existingPlan, setExistingPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.dailyPlans
      .where('dateKey')
      .equals(dateKey)
      .first()
      .then((plan) => {
        if (plan) {
          setExistingPlan(plan);
          setSelectedPriorities(plan.priorityIds || []);
          if (plan.note) setNote(plan.note);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dateKey]);

  const toggleTaskPriority = (taskId: string) => {
    if (selectedPriorities.includes(taskId)) {
      setSelectedPriorities(selectedPriorities.filter((id) => id !== taskId));
    } else {
      if (selectedPriorities.length >= 3) {
        showToast('You can select a maximum of 3 priorities for a focused day', 'warning');
        return;
      }
      setSelectedPriorities([...selectedPriorities, taskId]);
    }
  };

  const handleAddCustomPriority = () => {
    const trimmed = customPriorityText.trim();
    if (!trimmed) return;
    if (selectedPriorities.length >= 3) {
      showToast('Maximum of 3 priorities allowed', 'warning');
      return;
    }
    const customId = `custom-${Date.now()}`;
    setCustomPriorities([...customPriorities, { id: customId, title: trimmed }]);
    setSelectedPriorities([...selectedPriorities, customId]);
    setCustomPriorityText('');
  };

  const handleSavePlan = async () => {
    if (selectedPriorities.length === 0) {
      showToast('Please select at least 1 priority for today', 'warning');
      return;
    }

    try {
      const planId = existingPlan?.id || generateId();
      const plan: DailyPlan = {
        id: planId,
        dateKey,
        priorityIds: selectedPriorities,
        createdAt: existingPlan?.createdAt || new Date().toISOString(),
        shutdownAt: existingPlan?.shutdownAt,
        note: note.trim() || undefined,
      };

      await db.dailyPlans.put(plan);
      await awardDailyPlanXp(dateKey);

      showToast(`🎯 Today's focus calibrated! (${selectedPriorities.length} priorities set)`, 'success');
      onSaved?.();
      onPlanSaved?.();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Could not save daily plan', 'danger');
    }
  };

  // Combine tasks and custom priorities for display
  const allPriorityOptions = [
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: 'task',
      subtitle: t.dueTime ? `Due ${t.dueTime}` : 'Due today',
      status: t.status,
    })),
    ...customPriorities.map((c) => ({
      id: c.id,
      title: c.title,
      type: 'custom',
      subtitle: 'Custom priority',
      status: 'todo',
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[90vh] bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))]">
                <Target className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[rgb(var(--c-primary))]">
                Under 60s Ritual
              </span>
            </div>
            <h2 className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
              Plan My Day • {dateKey}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Quick Schedule Briefing */}
          <div className="space-y-2">
            <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Lectures & Commitments Today ({classes.length})</span>
            </h3>
            {classes.length === 0 ? (
              <p className="text-xs text-[rgb(var(--c-muted))] italic bg-[rgb(var(--c-surface2))] p-2.5 rounded-xl">
                No classes scheduled for today. You have an open study schedule!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {classes.map((c, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[rgb(var(--c-text))]">
                        {c.course?.code || 'Class'}
                      </span>
                      <span className="text-[rgb(var(--c-muted))] ml-1">
                        {c.startTime}–{c.endTime}
                      </span>
                    </div>
                    {c.isCancelled && (
                      <span className="text-[10px] text-rose-500 font-bold uppercase">Cancelled</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pick 1-3 Priorities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Pick 1 to 3 Core Priorities</span>
              </h3>
              <span className="text-xs font-mono font-bold text-[rgb(var(--c-primary))]">
                {selectedPriorities.length}/3 Selected
              </span>
            </div>

            {/* List of Tasks to choose from */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {allPriorityOptions.length === 0 ? (
                <p className="text-xs text-[rgb(var(--c-muted))] italic bg-[rgb(var(--c-surface2))] p-3 rounded-xl">
                  No due tasks found for today. Add a custom priority below!
                </p>
              ) : (
                allPriorityOptions.map((opt) => {
                  const isSelected = selectedPriorities.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleTaskPriority(opt.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-primary))]/10 shadow-xs'
                          : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/60 hover:bg-[rgb(var(--c-surface2))]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-primary))] text-white'
                              : 'border-[rgb(var(--c-border))]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-[rgb(var(--c-text))] truncate">
                            {opt.title}
                          </p>
                          <p className="text-[10px] text-[rgb(var(--c-muted))] truncate">
                            {opt.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick add custom priority input */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                placeholder="Or type a custom priority..."
                value={customPriorityText}
                onChange={(e) => setCustomPriorityText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPriority()}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] placeholder:text-[rgb(var(--c-muted))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
              />
              <button
                type="button"
                onClick={handleAddCustomPriority}
                disabled={!customPriorityText.trim() || selectedPriorities.length >= 3}
                className="px-3 py-2 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs hover:bg-[rgb(var(--c-border))]/50 transition-colors disabled:opacity-40 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Daily Intention / Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
              Daily Intention (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Focus on quality deep work before 2 PM"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] placeholder:text-[rgb(var(--c-muted))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePlan}
            className="px-5 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Lock In Daily Plan (+20 XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
