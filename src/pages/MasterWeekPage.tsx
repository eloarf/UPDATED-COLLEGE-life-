import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { MasterWeekBlock, Course } from '../types';
import { DAY_NAMES, FULL_DAY_NAMES } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';
import {
  LayoutGrid,
  Plus,
  Clock,
  Laptop,
  Smartphone,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';

export const MasterWeekPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'study' | 'creative' | 'health' | 'rest' | 'admin' | 'social'>('study');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [dayType, setDayType] = useState<'dorm' | 'home' | 'both'>('dorm');

  const blocks = useLiveQuery(() => db.masterWeekBlocks.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await db.masterWeekBlocks.add({
      id: generateId(),
      title: title.trim(),
      category,
      dayOfWeek: dayOfWeek as any,
      startTime,
      endTime,
      dayType,
    });

    setTitle('');
    setIsModalOpen(false);
    showToast('Non-class timeblock registered!', 'success');
  };

  const handleDeleteBlock = async (id: string) => {
    await db.masterWeekBlocks.delete(id);
    showToast('Timeblock removed.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#8B5A3C] font-bold">
              Timeblock Architecture
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Master Week Schedule
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Non-class commitments • Dorm (mobile) vs Home (PC) days • Rotating study blocks
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8B5A3C] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Timeblock</span>
          </button>
        </div>

        {/* Day Pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {DAY_NAMES.map((name, idx) => (
            <button
              key={name}
              onClick={() => setSelectedDay(idx)}
              className={`flex-1 min-w-[50px] py-1.5 rounded-xl border text-xs font-heading font-bold transition active:scale-95 ${
                selectedDay === idx
                  ? 'border-[#8B5A3C] bg-[#8B5A3C] text-white shadow-xs'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Day Timeblocks */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
        <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
          {FULL_DAY_NAMES[selectedDay]} Non-Class Routine Blocks
        </div>

        {blocks.filter((b) => b.dayOfWeek === selectedDay).length === 0 ? (
          <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
            No recurring non-class blocks mapped for {FULL_DAY_NAMES[selectedDay]}. Add exercise, creative studio, or library blocks!
          </div>
        ) : (
          <div className="space-y-2">
            {blocks
              .filter((b) => b.dayOfWeek === selectedDay)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-8 rounded-full bg-[#8B5A3C]" />
                    <div>
                      <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                        {b.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-[#8B5A3C]">
                          <Clock className="w-3 h-3" /> {b.startTime} – {b.endTime}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{b.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          {b.dayType === 'home' ? <Laptop className="w-2.5 h-2.5" /> : <Smartphone className="w-2.5 h-2.5" />}
                          {b.dayType} mode
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBlock(b.id)}
                    className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Map Routine Timeblock
              </div>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Block Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Creative Music Session (2h)"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Day of Week
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    {DAY_NAMES.map((n, i) => (
                      <option key={n} value={i}>
                        {FULL_DAY_NAMES[i]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="study">Study &amp; Library</option>
                    <option value="creative">Creative Studio</option>
                    <option value="health">Exercise &amp; Flow</option>
                    <option value="rest">Rest &amp; Social</option>
                    <option value="admin">Admin &amp; Chores</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Context Day Type
                </label>
                <select
                  value={dayType}
                  onChange={(e) => setDayType(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="dorm">Dorm Day (Phone-first)</option>
                  <option value="home">Home Day (PC &amp; Studio)</option>
                  <option value="both">Both / General</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#8B5A3C] text-white font-heading text-xs font-bold"
              >
                Save Master Timeblock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
