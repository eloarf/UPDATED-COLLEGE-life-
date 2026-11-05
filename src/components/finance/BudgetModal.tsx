import React, { useState, useEffect } from 'react';
import { Budget, FinanceCategory } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { X, Target, Calendar } from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES } from '../../utils/financeEngine';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Budget) => Promise<void>;
  editingBudget: Budget | null;
  categories: FinanceCategory[];
  currentMonthKey: string; // YYYY-MM
  todayKey: string;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBudget,
  categories,
  currentMonthKey,
  todayKey,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('all');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseCategories = (categories.length > 0 ? categories : DEFAULT_FINANCE_CATEGORIES).filter(
    (c) => c.type === 'expense'
  );

  useEffect(() => {
    if (editingBudget) {
      setName(editingBudget.name || '');
      setCategory(editingBudget.category || 'all');
      setAmount((editingBudget.amount ?? editingBudget.monthlyLimit ?? '').toString());
      setPeriod(editingBudget.period || 'monthly');
      setStartDate(editingBudget.startDate || todayKey);
      setEndDate(editingBudget.endDate || '');
    } else {
      setName('');
      setCategory('all');
      setAmount('');
      setPeriod('monthly');
      setStartDate(todayKey);
      setEndDate('');
    }
    setErrorMsg('');
  }, [editingBudget, isOpen, todayKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid positive budget amount.');
      return;
    }

    if (period === 'custom') {
      if (!startDate || !endDate) {
        setErrorMsg('Please select both start date and end date for a custom period budget.');
        return;
      }
      if (endDate <= startDate) {
        setErrorMsg('End date must be strictly after start date.');
        return;
      }
    }

    const budgetId = editingBudget ? editingBudget.id : generateId();
    const budgetObj: Budget = {
      id: budgetId,
      name: name.trim() || undefined,
      category,
      amount: numericAmount,
      monthlyLimit: numericAmount,
      period,
      month: currentMonthKey,
      startDate: period === 'custom' ? startDate : undefined,
      endDate: period === 'custom' ? endDate : undefined,
    };

    setIsSubmitting(true);
    try {
      await onSave(budgetObj);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save budget');
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
              <Target className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              {editingBudget ? 'Edit Spending Budget' : 'Create New Spending Budget'}
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

          {/* Budget Name */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Budget Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly Dining Limit, Exam Prep Budget"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))]"
            />
          </div>

          {/* Category Scope */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Category Scope *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            >
              <option value="all">Overall (All Categories Combined)</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Type */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Budget Duration / Period *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition ${
                  period === 'monthly'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
                }`}
              >
                Monthly ({currentMonthKey})
              </button>
              <button
                type="button"
                onClick={() => setPeriod('custom')}
                className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition ${
                  period === 'custom'
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                    : 'bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
                }`}
              >
                Custom Date Range
              </button>
            </div>
          </div>

          {/* Custom Date Range if selected */}
          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
              <div>
                <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
                />
              </div>
            </div>
          )}

          {/* Amount Limit */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Maximum Spending Limit *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-sm font-mono font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          {/* Actions */}
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
              {isSubmitting ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
