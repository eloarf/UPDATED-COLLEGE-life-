import React, { useState, useEffect } from 'react';
import { RecurringTransaction, FinancialAccount, FinanceCategory } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { X, Clock, Calendar } from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES } from '../../utils/financeEngine';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rec: RecurringTransaction) => Promise<void>;
  editingRecurring: RecurringTransaction | null;
  accounts: FinancialAccount[];
  categories: FinanceCategory[];
  primaryCurrency?: string;
  todayKey: string;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecurring,
  accounts,
  categories,
  primaryCurrency = 'ETB',
  todayKey,
}) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(todayKey);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const availableCategories = (categories.length > 0 ? categories : DEFAULT_FINANCE_CATEGORIES).filter(
    (c) => c.type === type
  );

  const selectedCatObj = availableCategories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  );

  useEffect(() => {
    if (editingRecurring) {
      setType(editingRecurring.type);
      setAmount(editingRecurring.amount.toString());
      setCategory(editingRecurring.category);
      setSubcategory(editingRecurring.subcategory || '');
      setAccountId(editingRecurring.financialAccountId || editingRecurring.accountId || activeAccounts[0]?.id || '');
      setFrequency(editingRecurring.frequency === 'custom' ? 'monthly' : editingRecurring.frequency);
      setNextDueDate(editingRecurring.nextDueDate);
      setNotes(editingRecurring.notes || '');
    } else {
      setType('expense');
      setAmount('');
      const firstCat = availableCategories[0];
      setCategory(firstCat ? firstCat.name : 'Internet & Airtime');
      setSubcategory(firstCat && firstCat.subcategories.length > 0 ? firstCat.subcategories[0] : '');
      setAccountId(activeAccounts[0]?.id || '');
      setFrequency('monthly');
      setNextDueDate(todayKey);
      setNotes('');
    }
    setErrorMsg('');
  }, [editingRecurring, isOpen, todayKey]);

  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const catObj = availableCategories.find((c) => c.name === catName);
    if (catObj && catObj.subcategories.length > 0) {
      setSubcategory(catObj.subcategories[0]);
    } else {
      setSubcategory('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount.');
      return;
    }

    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }

    if (!nextDueDate) {
      setErrorMsg('Please specify next due date.');
      return;
    }

    const recId = editingRecurring ? editingRecurring.id : generateId();
    const recObj: RecurringTransaction = {
      id: recId,
      type,
      amount: numericAmount,
      currency: editingRecurring?.currency || primaryCurrency,
      category,
      subcategory: subcategory || undefined,
      financialAccountId: accountId || undefined,
      accountId: accountId || undefined,
      frequency,
      nextDueDate,
      lastGeneratedDate: editingRecurring?.lastGeneratedDate,
      isActive: editingRecurring ? editingRecurring.isActive : true,
      notes: notes.trim() || undefined,
      createdAt: editingRecurring?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(recObj);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save recurring template');
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
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              {editingRecurring ? 'Edit Recurring Schedule' : 'Schedule Recurring Transaction'}
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

          {/* Type */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const expCats = (categories.length > 0 ? categories : DEFAULT_FINANCE_CATEGORIES).filter(
                  (c) => c.type === 'expense'
                );
                setCategory(expCats[0]?.name || 'Internet & Airtime');
              }}
              className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              Recurring Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                const incCats = (categories.length > 0 ? categories : DEFAULT_FINANCE_CATEGORIES).filter(
                  (c) => c.type === 'income'
                );
                setCategory(incCats[0]?.name || 'Allowance & Stipend');
              }}
              className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              Recurring Income
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Amount ({primaryCurrency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-sm font-mono font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Recurrence Frequency *
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-1.5 text-center rounded-xl text-xs font-heading font-bold capitalize transition ${
                    frequency === freq
                      ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                      : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
              >
                <option value="">General</option>
                {selectedCatObj?.subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Default Account / Wallet
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency || 'ETB'})
                </option>
              ))}
            </select>
          </div>

          {/* Next Due Date */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Next Due Date *
            </label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Schedule Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly campus dorm internet subscription"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))]"
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
              {isSubmitting ? 'Saving...' : editingRecurring ? 'Update Schedule' : 'Save Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
