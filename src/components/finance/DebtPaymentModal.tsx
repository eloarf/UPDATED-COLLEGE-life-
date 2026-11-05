import React, { useState } from 'react';
import { DebtRecord, FinancialAccount } from '../../types';
import { X, HandCoins, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatMoney } from '../../utils/financeEngine';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord;
  accounts: FinancialAccount[];
  onExecutePayment: (params: {
    amount: number;
    accountId: string;
    notes?: string;
  }) => Promise<void>;
  primaryCurrency?: string;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  accounts,
  onExecutePayment,
  primaryCurrency = 'ETB',
}) => {
  const isPayable = debt.type === 'payable' || debt.type === 'owe';
  const totalAmount = Number(debt.amount ?? debt.originalAmount) || 0;
  const currentPaid = Number(debt.paidAmount) || 0;
  const remaining = typeof debt.remainingAmount === 'number'
    ? debt.remainingAmount
    : Math.max(0, totalAmount - currentPaid);

  const [amount, setAmount] = useState(remaining > 0 ? remaining.toString() : '');
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
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }

    if (numericAmount > remaining) {
      setErrorMsg(`Payment amount cannot exceed remaining balance (${remaining} ${debt.currency || primaryCurrency}).`);
      return;
    }

    if (!accountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onExecutePayment({
        amount: numericAmount,
        accountId,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Payment recording failed');
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
            <div>
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {isPayable ? 'Record Debt Repayment' : 'Record Debt Collection'}
              </h3>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                {debt.personName || debt.person} — Rem: {formatMoney(remaining, debt.currency || primaryCurrency)}
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

          {/* Quick Pay Options */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-xs">
            <div>
              <span className="text-[rgb(var(--c-muted))]">Remaining Balance:</span>{' '}
              <span className="font-mono font-bold text-[rgb(var(--c-text))]">
                {formatMoney(remaining, debt.currency || primaryCurrency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(remaining.toString())}
              className="px-2.5 py-1 rounded-lg bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))] font-heading font-bold text-[10px] hover:bg-[rgb(var(--c-primary))]/25 transition"
            >
              Pay Full Remaining
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Payment Amount ({debt.currency || primaryCurrency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
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
              {isPayable ? 'Paid From Account (Outflow)' : 'Received Into Account (Inflow)'} *
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
              placeholder="e.g. Partial repayment via Telebirr"
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
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
