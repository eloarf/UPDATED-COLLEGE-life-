import React from 'react';
import {
  FinancialAccount,
  FinanceCategory,
} from '../../types';
import { TransactionFilterOptions } from '../../utils/financeEngine';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Calendar,
  DollarSign,
  ArrowUpDown,
  Tag,
} from 'lucide-react';

interface TransactionFilterDrawerProps {
  filters: TransactionFilterOptions;
  onChange: (updated: TransactionFilterOptions) => void;
  onReset: () => void;
  accounts: FinancialAccount[];
  categories: FinanceCategory[];
  totalMatches: number;
}

export const TransactionFilterDrawer: React.FC<TransactionFilterDrawerProps> = ({
  filters,
  onChange,
  onReset,
  accounts,
  categories,
  totalMatches,
}) => {
  const selectedCatObj = categories.find(
    (c) => c.name.toLowerCase() === (filters.category || '').toLowerCase()
  );

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.type !== 'all' ||
    filters.accountId !== 'all' ||
    filters.category !== 'all' ||
    filters.subcategory !== 'all' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.sortOrder !== 'newest';

  return (
    <div className="p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4 shadow-xs">
      {/* Search Input & Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--c-muted))]" />
          <input
            type="text"
            placeholder="Search notes, category, subcategory, or tags..."
            value={filters.searchQuery || ''}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-between">
          <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] px-2">
            {totalMatches} {totalMatches === 1 ? 'record' : 'records'}
          </span>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-heading font-bold transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row 1: Type Pills */}
      <div>
        <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
          Type
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Types' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
              { id: 'transfer', label: 'Transfers' },
              { id: 'saving', label: 'Savings' },
              { id: 'debt_repayment', label: 'Debts' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onChange({ ...filters, type: item.id })}
              className={`px-3 py-1 rounded-xl text-xs font-heading font-bold transition ${
                (filters.type || 'all') === item.id
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                  : 'bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/30'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row 2: Account, Category, Subcategory */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Account Selector */}
        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Account / Wallet
          </label>
          <select
            value={filters.accountId || 'all'}
            onChange={(e) => onChange({ ...filters, accountId: e.target.value })}
            className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] font-medium"
          >
            <option value="all">All Accounts</option>
            {accounts
              .filter((a) => !a.isArchived)
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency || 'ETB'})
                </option>
              ))}
          </select>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={filters.category || 'all'}
            onChange={(e) => onChange({ ...filters, category: e.target.value, subcategory: 'all' })}
            className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory Selector */}
        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Subcategory
          </label>
          <select
            value={filters.subcategory || 'all'}
            onChange={(e) => onChange({ ...filters, subcategory: e.target.value })}
            disabled={!selectedCatObj || selectedCatObj.subcategories.length === 0}
            className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] font-medium disabled:opacity-50"
          >
            <option value="all">All Subcategories</option>
            {selectedCatObj?.subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Row 3: Date Range & Amount Limits & Sorting */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-[rgb(var(--c-border))]/60">
        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>From Date</span>
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
            className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>To Date</span>
          </label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
            className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>Amount Range</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={filters.minAmount !== undefined ? filters.minAmount : ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxAmount !== undefined ? filters.maxAmount : ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-mono text-[rgb(var(--c-text))]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            <span>Sort Order</span>
          </label>
          <select
            value={filters.sortOrder || 'newest'}
            onChange={(e) => onChange({ ...filters, sortOrder: e.target.value as any })}
            className="w-full p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))] font-medium"
          >
            <option value="newest">Date: Newest First</option>
            <option value="oldest">Date: Oldest First</option>
            <option value="highest">Amount: Highest First</option>
            <option value="lowest">Amount: Lowest First</option>
          </select>
        </div>
      </div>
    </div>
  );
};
