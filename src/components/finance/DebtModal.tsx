import React, { useState, useEffect } from 'react';
import { DebtRecord } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { X, HandCoins, Calendar } from 'lucide-react';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: DebtRecord) => Promise<void>;
  editingDebt: DebtRecord | null;
  primaryCurrency?: string;
  todayKey: string;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDebt,
  primaryCurrency = 'ETB',
  todayKey,
}) => {
  const [type, setType] = useState<'payable' | 'receivable'>('payable');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingDebt) {
      setType(editingDebt.type === 'receivable' || editingDebt.type === 'owed' ? 'receivable' : 'payable');
      setPersonName(editingDebt.personName || editingDebt.person || '');
      setAmount((editingDebt.amount ?? editingDebt.originalAmount ?? '').toString());
      setDueDate(editingDebt.dueDate || '');
      setNotes(editingDebt.notes || '');
    } else {
      setType('payable');
      setPersonName('');
      setAmount('');
      setDueDate('');
      setNotes('');
    }
    setErrorMsg('');
  }, [editingDebt, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (!personName.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter the person/counterparty name and a valid amount.');
      return;
    }

    const debtId = editingDebt ? editingDebt.id : generateId();
    const paidAmount = editingDebt ? editingDebt.paidAmount : 0;
    const remainingAmount = Math.max(0, numericAmount - paidAmount);
    const status = paidAmount >= numericAmount ? 'settled' : paidAmount > 0 ? 'partial' : 'pending';

    const debt: DebtRecord = {
      id: debtId,
      type,
      personName: personName.trim(),
      person: personName.trim(),
      amount: numericAmount,
      originalAmount: numericAmount,
      paidAmount,
      remainingAmount,
      currency: editingDebt?.currency || primaryCurrency,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      status,
      createdAt: editingDebt?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(debt);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save debt record');
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
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-500">
              <HandCoins className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              {editingDebt ? 'Edit Debt Record' : 'Record New Debt or Loan'}
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

          {/* Type Switcher */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Debt Relationship *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setType('payable')}
                className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition ${
                  type === 'payable'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                ⚠️ I Owe (Payable)
              </button>
              <button
                type="button"
                onClick={() => setType('receivable')}
                className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition ${
                  type === 'receivable'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                💰 Owed to Me (Receivable)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              {type === 'payable' ? 'Creditor / Person I Owe *' : 'Debtor / Person Who Owes Me *'}
            </label>
            <input
              type="text"
              placeholder="e.g. Dawit, Campus Cafeteria, Bookstore"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Total Amount ({primaryCurrency}) *
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

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Due Date / Deadline (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Borrowed for textbooks, will repay on stipend day..."
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
              {isSubmitting ? 'Saving...' : editingDebt ? 'Update Record' : 'Record Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
