import React, { useState } from 'react';
import { SavingsGoal, FinancialAccount } from '../../types';
import { X, PiggyBank, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatMoney } from '../../utils/financeEngine';

interface SavingsActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal;
  accounts: FinancialAccount[];
  onExecute: (params: {
    type: 'deposit' | 'withdraw';
    amount: number;
    accountId: string;
    notes?: string;
  }) => Promise<void>;
  primaryCurrency?: string;
}

export const SavingsActionModal: React.FC<SavingsActionModalProps> = ({
  isOpen,
  onClose,
  goal,
  accounts,
  onExecute,
  primaryCurrency = 'ETB',
}) => {
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(
    accounts.find((a) => !a.isArchived)?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.isArchived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    if (actionType === 'withdraw' && numericAmount > goal.currentAmount) {
      setErrorMsg(`Cannot withdraw more than current saved amount (${goal.currentAmount} ${goal.currency || primaryCurrency}).`);
      return;
    }

    if (!accountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onExecute({
        type: actionType,
        amount: numericAmount,
        accountId,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Transaction failed');
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
            <div>
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {actionType === 'deposit' ? 'Contribute to Goal' : 'Withdraw from Goal'}
              </h3>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                {goal.title} ({formatMoney(goal.currentAmount, goal.currency || primaryCurrency)} / {formatMoney(goal.targetAmount, goal.currency || primaryCurrency)})
              </p>
            </div>
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

          {/* Action Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <button
              type="button"
              onClick={() => setActionType('deposit')}
              className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition flex items-center justify-center gap-1.5 ${
                actionType === 'deposit'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposit (Allocate)</span>
            </button>
            <button
              type="button"
              onClick={() => setActionType('withdraw')}
              className={`py-2 text-center rounded-xl text-xs font-heading font-bold transition flex items-center justify-center gap-1.5 ${
                actionType === 'withdraw'
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdraw to Account</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Amount ({goal.currency || primaryCurrency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-sm font-mono font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              {actionType === 'deposit' ? 'Funding Account (Source)' : 'Destination Account'} *
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency || 'ETB'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Optional Note
            </label>
            <input
              type="text"
              placeholder="e.g. November monthly savings transfer"
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
              {isSubmitting ? 'Processing...' : actionType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
