import React, { useState, useEffect } from 'react';
import { FinancialAccount, FinancialAccountType } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { X, Wallet, Building2, Smartphone, Banknote, PiggyBank, Coins } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../../utils/financeEngine';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: FinancialAccount) => Promise<void>;
  editingAccount: FinancialAccount | null;
  primaryCurrency?: string;
  isFirstAccount?: boolean;
}

const ACCOUNT_TYPES: { type: FinancialAccountType; label: string; icon: any }[] = [
  { type: 'bank', label: 'Bank Account', icon: Building2 },
  { type: 'mobile_money', label: 'Mobile Money (Telebirr/CBE Birr)', icon: Smartphone },
  { type: 'cash', label: 'Cash on Hand', icon: Banknote },
  { type: 'savings', label: 'Dedicated Savings', icon: PiggyBank },
  { type: 'digital_wallet', label: 'Digital Wallet', icon: Wallet },
  { type: 'custom', label: 'Custom Wallet', icon: Coins },
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAccount,
  primaryCurrency = 'ETB',
  isFirstAccount = false,
}) => {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<FinancialAccountType>('bank');
  const [institution, setInstitution] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [currency, setCurrency] = useState(primaryCurrency);
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(isFirstAccount);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setAccountType(editingAccount.accountType || editingAccount.type || 'bank');
      setInstitution(editingAccount.institution || '');
      setOpeningBalance(editingAccount.openingBalance.toString());
      setCurrency(editingAccount.currency || primaryCurrency);
      setNotes(editingAccount.notes || '');
      setIsDefault(Boolean(editingAccount.isDefault));
    } else {
      setName('');
      setAccountType('bank');
      setInstitution('Commercial Bank of Ethiopia (CBE)');
      setOpeningBalance('');
      setCurrency(primaryCurrency);
      setNotes('');
      setIsDefault(isFirstAccount);
    }
    setErrorMsg('');
  }, [editingAccount, isOpen, primaryCurrency, isFirstAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }

    const numericBalance = openingBalance ? parseFloat(openingBalance) : 0;
    if (isNaN(numericBalance)) {
      setErrorMsg('Please enter a valid numeric opening balance.');
      return;
    }

    const accId = editingAccount ? editingAccount.id : generateId();
    const account: FinancialAccount = {
      id: accId,
      name: name.trim(),
      type: accountType,
      accountType,
      institution: institution.trim() || undefined,
      openingBalance: numericBalance,
      currency: currency || primaryCurrency,
      notes: notes.trim() || undefined,
      isDefault,
      isArchived: editingAccount?.isArchived || false,
      createdAt: editingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(account);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save account');
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
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              {editingAccount ? 'Edit Account / Wallet' : 'Add Financial Account'}
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

          {/* Account Type Grid */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
              Account Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = accountType === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setAccountType(t.type);
                      if (t.type === 'mobile_money' && !institution) setInstitution('Telebirr');
                      if (t.type === 'bank' && !institution) setInstitution('CBE');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                      isSelected
                        ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-primary))]/10 text-[rgb(var(--c-primary))] font-bold'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/20'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Account Name *
            </label>
            <input
              type="text"
              placeholder="e.g. CBE Student Checking, Telebirr Wallet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
              Financial Institution (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Commercial Bank of Ethiopia, Awash, Telebirr"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono font-bold text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-bold text-[rgb(var(--c-text))]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultAcc"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded-md accent-[rgb(var(--c-primary))]"
            />
            <label htmlFor="isDefaultAcc" className="text-xs font-heading text-[rgb(var(--c-text))] cursor-pointer">
              Set as primary default account
            </label>
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
              {isSubmitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
