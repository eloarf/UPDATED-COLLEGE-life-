import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Task, Course } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp, reverseXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Calendar,
  Clock,
  Smartphone,
  Laptop,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const QuestsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'done'>('today');
  const [quickInput, setQuickInput] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Filter tasks
  let filteredTasks = tasks;
  if (activeTab === 'today') {
    filteredTasks = tasks.filter((t) => t.status !== 'done' && (t.dueDate === todayKey || !t.dueDate));
  } else if (activeTab === 'upcoming') {
    filteredTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > todayKey);
  } else if (activeTab === 'overdue') {
    filteredTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayKey);
  } else if (activeTab === 'done') {
    filteredTasks = tasks.filter((t) => t.status === 'done');
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const taskId = generateId();
    const now = new Date().toISOString();

    await db.tasks.add({
      id: taskId,
      title: quickInput.trim(),
      priority: 'medium',
      effort: 'medium',
      dueDate: todayKey,
      status: 'todo',
      contextTag: 'any',
      createdAt: now,
      updatedAt: now,
    });

    setQuickInput('');
    showToast('Quest added to your ledger!', 'success');
  };

  const handleToggleTask = async (task: Task) => {
    const isNowDone = task.status !== 'done';
    const newStatus = isNowDone ? 'done' : 'todo';

    await db.tasks.update(task.id, {
      status: newStatus,
      completedAt: isNowDone ? new Date().toISOString() : undefined,
    });

    if (isNowDone) {
      const xpAmount = task.effort === 'large' ? 50 : task.effort === 'medium' ? 25 : 10;
      await awardXp({
        source: 'task',
        sourceId: task.id,
        amount: xpAmount,
        stat: 'discipline',
      });
      showToast(`Quest completed! +${xpAmount} XP awarded`, 'success');
    } else {
      await reverseXp('task', task.id);
      showToast('Quest re-opened.', 'info');
    }
  };

  const handleDeleteTask = async (id: string) => {
    await db.tasks.delete(id);
    showToast('Quest removed.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
              University Quest Log
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Assignments, Drills &amp; Tasks
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Ticket stub receipts • XP payouts • Forgiving rollover (no shame alarms)
            </p>
          </div>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Quick-add assignment or quest... (Press Enter)"
            className="flex-1 px-4 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-[rgb(var(--c-border))] pb-1 overflow-x-auto scrollbar-none">
          {[
            { key: 'today', label: 'Today', count: tasks.filter((t) => t.status !== 'done' && (t.dueDate === todayKey || !t.dueDate)).length },
            { key: 'upcoming', label: 'Upcoming', count: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > todayKey).length },
            { key: 'overdue', label: 'Rolled Over', count: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayKey).length },
            { key: 'done', label: 'Conquered', count: tasks.filter((t) => t.status === 'done').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 text-xs font-heading font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-[#7A2E4A] text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/10">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-10 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
            No active quests under this tab. Enjoy your university momentum or add a new task above!
          </div>
        ) : (
          filteredTasks.map((task) => {
            const course = task.courseId ? courseMap.get(task.courseId) : null;
            const isDone = task.status === 'done';
            const isOverdue = task.dueDate && task.dueDate < todayKey && !isDone;
            const isExpanded = expandedTask === task.id;

            return (
              <div
                key={task.id}
                className={`ticket-cutout ticket-border rounded-2xl p-3.5 bg-[rgb(var(--c-surface))] transition hover:border-[#7A2E4A] ${
                  isDone ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-[#7A2E4A] shrink-0 hover:scale-110 active:scale-95 transition"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {course && (
                          <span
                            className="text-[9px] font-heading font-bold px-2 py-0.5 rounded-full text-stone-900"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.code}
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold font-heading ${
                            isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                          }`}
                        >
                          {task.title}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                            Rolled over from {formatDisplayDate(task.dueDate!)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[rgb(var(--c-muted))] mt-1.5 flex-wrap">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#7A2E4A]" /> {formatDisplayDate(task.dueDate)}
                          </span>
                        )}
                        {task.contextTag === 'laptop' && (
                          <span className="flex items-center gap-1">
                            <Laptop className="w-3 h-3" /> Needs Laptop
                          </span>
                        )}
                        {task.contextTag === 'phone' && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> Phone-friendly
                          </span>
                        )}
                        <span className="text-[10px] font-heading text-[rgb(var(--c-xp))]">
                          +{task.effort === 'large' ? 50 : task.effort === 'medium' ? 25 : 10} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                      title="Inspect details"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))]"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtasks / Notes Expansion */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[rgb(var(--c-border))] space-y-2 text-xs">
                    {task.notes && (
                      <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] font-flourish">
                        {task.notes}
                      </div>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
                          Subtasks Checklist
                        </div>
                        {task.subtasks.map((st) => (
                          <div key={st.id} className="flex items-center gap-2 text-xs">
                            <span className={st.done ? 'text-emerald-500' : 'text-stone-400'}>
                              {st.done ? '✓' : '○'}
                            </span>
                            <span className={st.done ? 'line-through text-[rgb(var(--c-muted))]' : ''}>
                              {st.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
