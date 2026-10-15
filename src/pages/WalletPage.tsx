import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Transaction, Budget } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  CreditCard,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Cafeteria');
  const [account, setAccount] = useState<'cash' | 'bank' | 'mobile_money'>('cash');
  const [notes, setNotes] = useState('');

  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    await db.transactions.add({
      id: generateId(),
      type,
      amount: num,
      currency: 'ETB',
      category,
      account,
      date: getTodayKey(),
      notes: notes.trim() || undefined,
    });

    if (type === 'expense') {
      await awardXp({
        source: 'transaction',
        sourceId: generateId(),
        amount: 5,
        stat: 'discipline',
      });
      showToast(`Expense logged: ${num} ETB (+5 XP)`, 'success');
    } else {
      showToast(`Income added: ${num} ETB`, 'success');
    }

    setAmount('');
    setNotes('');
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    await db.transactions.delete(id);
    showToast('Transaction entry deleted.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#E5C04B] font-bold">
              Campus Treasury &amp; Vault
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Student Wallet &amp; ETB Budget
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Cash • Telebirr • Commercial Bank of Ethiopia (CBE)
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E5C04B] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Transaction</span>
          </button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              Net Balance
            </span>
            <div className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              {balance.toFixed(2)} ETB
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <span className="text-[10px] font-heading uppercase text-rose-500 font-bold">
              Total Spent
            </span>
            <div className="text-base sm:text-lg font-heading font-bold text-rose-600 mt-0.5">
              {totalExpense.toFixed(2)} ETB
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <span className="text-[10px] font-heading uppercase text-emerald-500 font-bold">
              Total In
            </span>
            <div className="text-base sm:text-lg font-heading font-bold text-emerald-600 mt-0.5">
              {totalIncome.toFixed(2)} ETB
            </div>
          </div>
        </div>
      </div>

      {/* Perforated Receipt List */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
        <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
          Receipt Ledger ({transactions.length} entries)
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
            No transactions logged this term. Log your daily cafeteria lunch or bus fares!
          </div>
        ) : (
          <div className="space-y-2">
            {[...transactions].reverse().map((t) => (
              <div
                key={t.id}
                className="ticket-cutout p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    {t.category}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))]">
                    {formatDisplayDate(t.date)} • {t.account.replace('_', ' ')} {t.notes && `• “${t.notes}”`}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-heading font-bold text-xs ${
                      t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {t.type === 'expense' ? '-' : '+'}
                    {t.amount.toFixed(2)} ETB
                  </span>
                  <button
                    onClick={() => handleDeleteTransaction(t.id)}
                    className="text-[rgb(var(--c-muted))] hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Issue Receipt Transaction
              </div>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-xl text-xs font-heading font-bold border ${
                    type === 'expense'
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]'
                  }`}
                >
                  Expense Out
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-xl text-xs font-heading font-bold border ${
                    type === 'income'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]'
                  }`}
                >
                  Allowance / In
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Amount in ETB
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="Food & Cafeteria">Food &amp; Cafeteria</option>
                    <option value="Coffee & Snacks">Coffee &amp; Snacks</option>
                    <option value="Stationery & Prints">Stationery &amp; Prints</option>
                    <option value="Campus Transport">Campus Transport</option>
                    <option value="Internet & Mobile">Internet &amp; Data</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Payment Medium
                  </label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="cash">Cash in Pocket</option>
                    <option value="mobile_money">Telebirr / Mobile</option>
                    <option value="bank">CBE Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Memo
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Math homework printouts"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#E5C04B] text-stone-950 font-heading text-xs font-bold"
              >
                Inscribe to Treasury
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
