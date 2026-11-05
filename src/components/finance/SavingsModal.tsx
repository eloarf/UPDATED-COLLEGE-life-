import React, { useState, useEffect } from 'react';
import { SavingsGoal } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { X, PiggyBank, Calendar } from 'lucide-react';

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: SavingsGoal) => Promise<void>;
  editingGoal: SavingsGoal | null;
  primaryCurrency?: string;
  todayKey: string;
}

export const SavingsModal: React.FC<SavingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGoal,
  primaryCurrency = 'ETB',
  todayKey,
}) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('emergency');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setTitle(editingGoal.title);
      setTargetAmount(editingGoal.targetAmount.toString());
      setDeadline(editingGoal.deadline || '');
      setCategory(editingGoal.category || 'emergency');
      setNotes(editingGoal.notes || '');
    } else {
      setTitle('');
      setTargetAmount('');
      setDeadline('');
      setCategory('emergency');
      setNotes('');
    }
    setErrorMsg('');
  }, [editingGoal, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericTarget = parseFloat(targetAmount);
    if (!title.trim() || isNaN(numericTarget) || numericTarget <= 0) {
      setErrorMsg('Please enter a goal title and target amount.');
      return;
    }

    const goalId = editingGoal ? editingGoal.id : generateId();
    const goal: SavingsGoal = {
      id: goalId,
      title: title.trim(),
      targetAmount: numericTarget,
      currentAmount: editingGoal ? editingGoal.currentAmount : 0,
      currency: editingGoal?.currency || primaryCurrency,
      deadline: deadline || undefined,
      category,
      notes: notes.trim() || undefined,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(goal);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save savings goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
              <PiggyBank className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-heading">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Goal Title *
            </label>
            <input
              type="text"
              placeholder="e.g. New Laptop Fund, Semester Contingency"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Target Amount ({primaryCurrency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 15000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Target Deadline (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Goal Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            >
              <option value="emergency">Emergency / Contingency</option>
              <option value="tech">Tech &amp; Hardware</option>
              <option value="education">Education &amp; Certification</option>
              <option value="travel">Travel &amp; Break</option>
              <option value="personal">Personal Project</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Why this goal matters..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs resize-none text-[rgb(var(--c-text))]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgb(var(--c-border))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-xs font-heading font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
            >
              {isSubmitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Save Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
