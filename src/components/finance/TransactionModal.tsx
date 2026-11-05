import React, { useState, useEffect } from 'react';
import {
  FinancialAccount,
  Transaction,
  FinanceCategory,
  SavingsGoal,
  DebtRecord,
} from '../../types';
import { generateId } from '../../utils/idGenerator';
import {
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  PiggyBank,
  HandCoins,
  Tag,
  FileText,
  Calendar,
} from 'lucide-react';
import { DEFAULT_FINANCE_CATEGORIES } from '../../utils/financeEngine';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction, isNew: boolean) => Promise<void>;
  editingTx: Transaction | null;
  accounts: FinancialAccount[];
  categories: FinanceCategory[];
  savingsGoals: SavingsGoal[];
  debts: DebtRecord[];
  primaryCurrency?: string;
  todayKey: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTx,
  accounts,
  categories,
  savingsGoals,
  debts,
  primaryCurrency = 'ETB',
  todayKey,
}) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer' | 'saving' | 'debt_repayment'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(primaryCurrency);
  const [accountId, setAccountId] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState(todayKey);
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const defaultAcc = activeAccounts.find((a) => a.isDefault) || activeAccounts[0];

  // Filter categories by transaction type
  const availableCategories = categories.length > 0 ? categories : DEFAULT_FINANCE_CATEGORIES;
  const filteredCategories = availableCategories.filter((c) =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  const selectedCategoryObj = filteredCategories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  );

  useEffect(() => {
    if (editingTx) {
      if (editingTx.debtId) {
        setType('debt_repayment');
        setSelectedDebtId(editingTx.debtId);
      } else {
        setType(editingTx.type);
      }
      setAmount(editingTx.amount.toString());
      setCurrency(editingTx.currency || primaryCurrency);
      setAccountId(editingTx.financialAccountId || editingTx.accountId || defaultAcc?.id || '');
      setSourceAccountId(editingTx.sourceAccountId || defaultAcc?.id || '');
      setTargetAccountId(editingTx.targetAccountId || editingTx.toAccountId || '');
      setCategory(editingTx.category || '');
      setSubcategory(editingTx.subcategory || '');
      setDate(editingTx.date.substring(0, 10));
      setNotes(editingTx.notes || editingTx.description || '');
      setTagsInput((editingTx.tags || []).join(', '));
      setSelectedGoalId(editingTx.savingsGoalId || '');
    } else {
      setType('expense');
      setAmount('');
      setCurrency(primaryCurrency);
      const defaultId = defaultAcc?.id || '';
      setAccountId(defaultId);
      setSourceAccountId(defaultId);
      setTargetAccountId(activeAccounts.length > 1 ? activeAccounts[1].id : '');
      const firstCat = availableCategories.find((c) => c.type === 'expense');
      setCategory(firstCat ? firstCat.name : 'Food & Dining');
      setSubcategory(firstCat && firstCat.subcategories.length > 0 ? firstCat.subcategories[0] : '');
      setDate(todayKey);
      setNotes('');
      setTagsInput('');
      setSelectedGoalId('');
      setSelectedDebtId('');
    }
    setErrorMsg('');
  }, [editingTx, isOpen, primaryCurrency, todayKey]);

  // When type changes, adjust default category
  const handleTypeChange = (newType: typeof type) => {
    setType(newType);
    setErrorMsg('');
    if (newType === 'income') {
      const incCat = availableCategories.find((c) => c.type === 'income');
      setCategory(incCat ? incCat.name : 'Allowance & Stipend');
      setSubcategory(incCat && incCat.subcategories.length > 0 ? incCat.subcategories[0] : '');
    } else if (newType === 'expense') {
      const expCat = availableCategories.find((c) => c.type === 'expense');
      setCategory(expCat ? expCat.name : 'Food & Dining');
      setSubcategory(expCat && expCat.subcategories.length > 0 ? expCat.subcategories[0] : '');
    } else if (newType === 'transfer') {
      setCategory('Internal Transfer');
      setSubcategory('');
    } else if (newType === 'saving') {
      setCategory('Savings Contribution');
      setSubcategory('');
      if (savingsGoals.length > 0 && !selectedGoalId) {
        setSelectedGoalId(savingsGoals[0].id);
      }
    } else if (newType === 'debt_repayment') {
      setCategory('Debt Settlement');
      setSubcategory('');
      if (debts.length > 0 && !selectedDebtId) {
        setSelectedDebtId(debts[0].id);
      }
    }
  };

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
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    if (!date) {
      setErrorMsg('Please select a valid date.');
      return;
    }

    if (type === 'transfer') {
      if (!sourceAccountId || !targetAccountId) {
        setErrorMsg('Please select both source and destination accounts.');
        return;
      }
      if (sourceAccountId === targetAccountId) {
        setErrorMsg('Source and destination accounts must be different.');
        return;
      }
    } else if (type === 'saving') {
      if (!sourceAccountId && !accountId) {
        setErrorMsg('Please select the funding account.');
        return;
      }
    } else if (!accountId) {
      setErrorMsg('Please select an account for this transaction.');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const isNew = !editingTx;
    const txId = editingTx ? editingTx.id : generateId();

    let txType: 'expense' | 'income' | 'transfer' | 'saving' = 'expense';
    let isDebtRepayment = false;
    let debtId: string | undefined = undefined;
    let savingsGoalId: string | undefined = undefined;

    if (type === 'income') {
      txType = 'income';
    } else if (type === 'transfer') {
      txType = 'transfer';
    } else if (type === 'saving') {
      txType = 'saving';
      savingsGoalId = selectedGoalId || undefined;
    } else if (type === 'debt_repayment') {
      const debtObj = debts.find((d) => d.id === selectedDebtId);
      isDebtRepayment = true;
      debtId = selectedDebtId || undefined;
      // If paying someone back, it's an outflow; if collecting, it's an inflow
      txType = debtObj?.type === 'receivable' || debtObj?.type === 'owed' ? 'income' : 'expense';
    } else {
      txType = 'expense';
    }

    const tx: Transaction = {
      id: txId,
      amount: numericAmount,
      currency: currency || primaryCurrency,
      type: txType,
      category: category || (txType === 'income' ? 'Income' : 'Expense'),
      subcategory: subcategory || undefined,
      financialAccountId: type === 'transfer' ? undefined : (accountId || sourceAccountId),
      sourceAccountId: type === 'transfer' || type === 'saving' ? (sourceAccountId || accountId) : undefined,
      targetAccountId: type === 'transfer' ? targetAccountId : undefined,
      toAccountId: type === 'transfer' ? targetAccountId : undefined,
      date,
      time: editingTx?.time || new Date().toTimeString().substring(0, 5),
      notes: notes.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      debtId,
      isDebtRepayment,
      savingsGoalId,
      isSavingsContribution: type === 'saving',
      createdAt: editingTx?.createdAt || new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSave(tx, isNew);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[rgb(var(--c-primary))]/15 flex items-center justify-center text-[rgb(var(--c-primary))] font-bold">
              {type === 'income' ? (
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              ) : type === 'transfer' ? (
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
              ) : type === 'saving' ? (
                <PiggyBank className="w-4 h-4 text-amber-500" />
              ) : type === 'debt_repayment' ? (
                <HandCoins className="w-4 h-4 text-purple-500" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {editingTx ? 'Edit Transaction' : 'Quick Record Transaction'}
              </h2>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                Strict accounting rules applied automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-heading font-medium">
              {errorMsg}
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-heading font-bold transition flex flex-col items-center gap-1 ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Expense</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-heading font-bold transition flex flex-col items-center gap-1 ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Income</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-heading font-bold transition flex flex-col items-center gap-1 ${
                  type === 'transfer'
                    ? 'bg-blue-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('saving')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-heading font-bold transition flex flex-col items-center gap-1 ${
                  type === 'saving'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <PiggyBank className="w-3.5 h-3.5" />
                <span>Savings</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('debt_repayment')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-heading font-bold transition flex flex-col items-center gap-1 ${
                  type === 'debt_repayment'
                    ? 'bg-purple-500 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <HandCoins className="w-3.5 h-3.5" />
                <span>Debt</span>
              </button>
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                Amount *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
              >
                <option value="ETB">ETB (Br)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="KES">KES</option>
              </select>
            </div>
          </div>

          {/* Transfer Source & Target Accounts */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
              <div>
                <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                  From Account *
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold"
                >
                  <option value="">Select source...</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency || 'ETB'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                  To Account *
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold"
                >
                  <option value="">Select target...</option>
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency || 'ETB'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                {type === 'saving' ? 'Funding Account *' : 'Account / Wallet *'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
              >
                <option value="">Select Account...</option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {acc.institution || acc.accountType || acc.type} ({acc.currency || 'ETB'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Savings Goal Picker (if type === 'saving') */}
          {type === 'saving' && (
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                Target Savings Goal
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-bold"
              >
                <option value="">General Savings Allocation</option>
                {savingsGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    🎯 {g.title} (Target: {g.targetAmount} {g.currency || 'ETB'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Debt Record Picker (if type === 'debt_repayment') */}
          {type === 'debt_repayment' && (
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                Linked Debt Record
              </label>
              <select
                value={selectedDebtId}
                onChange={(e) => setSelectedDebtId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-bold"
              >
                <option value="">Select debt record...</option>
                {debts
                  .filter((d) => d.status !== 'settled')
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.type === 'payable' || d.type === 'owe' ? '⚠️ I owe' : '💰 Owed by'}{' '}
                      {d.personName || d.person} — Rem: {d.remainingAmount ?? ((d.amount ?? d.originalAmount ?? 0) - (d.paidAmount || 0))} {d.currency || 'ETB'}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category & Subcategory Pickers (for expense and income) */}
          {(type === 'expense' || type === 'income') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                  Subcategory
                </label>
                {selectedCategoryObj && selectedCategoryObj.subcategories.length > 0 ? (
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold"
                  >
                    <option value="">General</option>
                    {selectedCategoryObj.subcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Snacks, Books"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
              Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-mono font-medium"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-[rgb(var(--c-muted))]" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. campus, exam-week, project"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-[rgb(var(--c-muted))]" />
              <span>Optional Notes</span>
            </label>
            <textarea
              rows={2}
              placeholder="Add context, store name, or receipt details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgb(var(--c-border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] font-heading text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingTx ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
