import React, { useState } from 'react';
import { FinanceCategory } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Coins,
  Layers,
  ArrowRight,
  Info,
  DollarSign,
} from 'lucide-react';
import {
  DEFAULT_EXCHANGE_RATES,
  SUPPORTED_CURRENCIES,
  DEFAULT_FINANCE_CATEGORIES,
} from '../../utils/financeEngine';

interface CategorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: FinanceCategory[];
  onSaveCategories: (updated: FinanceCategory[]) => Promise<void>;
  primaryCurrency: string;
  onSavePrimaryCurrency: (curr: string) => Promise<void>;
  exchangeRates: Record<string, number>;
  onSaveExchangeRates: (rates: Record<string, number>) => Promise<void>;
}

export const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  primaryCurrency,
  onSavePrimaryCurrency,
  exchangeRates,
  onSaveExchangeRates,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'currencies'>('categories');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubcategories, setNewCatSubcategories] = useState('');

  // Editing Subcategories State
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [newSubcatInput, setNewSubcatInput] = useState('');

  // Currency & Rates State
  const [selectedPrimary, setSelectedPrimary] = useState(primaryCurrency || 'ETB');
  const [editableRates, setEditableRates] = useState<Record<string, number>>({
    ...DEFAULT_EXCHANGE_RATES,
    ...exchangeRates,
  });

  const catList = categories.length > 0 ? categories : DEFAULT_FINANCE_CATEGORIES;
  const filteredCats = catList.filter((c) => c.type === categoryType);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const subcats = newCatSubcategories
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newCat: FinanceCategory = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      type: categoryType,
      subcategories: subcats.length > 0 ? subcats : ['General'],
      isCustom: true,
    };

    const updated = [...catList, newCat];
    await onSaveCategories(updated);
    setNewCatName('');
    setNewCatSubcategories('');
  };

  const handleDeleteCategory = async (catId: string) => {
    const updated = catList.filter((c) => c.id !== catId);
    await onSaveCategories(updated);
    if (selectedCatId === catId) setSelectedCatId(null);
  };

  const handleAddSubcategoryToCategory = async (catId: string) => {
    if (!newSubcatInput.trim()) return;
    const cat = catList.find((c) => c.id === catId);
    if (!cat) return;

    const trimmed = newSubcatInput.trim();
    if (cat.subcategories.includes(trimmed)) return;

    const updated = catList.map((c) =>
      c.id === catId ? { ...c, subcategories: [...c.subcategories, trimmed] } : c
    );
    await onSaveCategories(updated);
    setNewSubcatInput('');
  };

  const handleRemoveSubcategory = async (catId: string, subcat: string) => {
    const updated = catList.map((c) =>
      c.id === catId
        ? { ...c, subcategories: c.subcategories.filter((s) => s !== subcat) }
        : c
    );
    await onSaveCategories(updated);
  };

  const handleSaveCurrencies = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePrimaryCurrency(selectedPrimary);
    await onSaveExchangeRates(editableRates);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]">
          <div>
            <h2 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              Categories &amp; Currency Settings
            </h2>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Manage editable categories, subcategories, and exchange rates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Sub-tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-[rgb(var(--c-border))] gap-3">
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`pb-2.5 text-xs font-heading font-bold flex items-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'categories'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories &amp; Subcategories</span>
          </button>

          <button
            onClick={() => setActiveSubTab('currencies')}
            className={`pb-2.5 text-xs font-heading font-bold flex items-center gap-1.5 border-b-2 transition ${
              activeSubTab === 'currencies'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Currencies &amp; Exchange Rates</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeSubTab === 'categories' ? (
            <>
              {/* Type Switcher */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCategoryType('expense');
                    setSelectedCatId(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-heading font-bold transition ${
                    categoryType === 'expense'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
                  }`}
                >
                  Expense Categories
                </button>
                <button
                  onClick={() => {
                    setCategoryType('income');
                    setSelectedCatId(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-heading font-bold transition ${
                    categoryType === 'income'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
                  }`}
                >
                  Income Categories
                </button>
              </div>

              {/* Add New Category Form */}
              <form
                onSubmit={handleAddCategory}
                className="p-3.5 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] space-y-2.5"
              >
                <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  Add New {categoryType === 'expense' ? 'Expense' : 'Income'} Category
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Category Name (e.g. Subscriptions)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))]"
                  />
                  <input
                    type="text"
                    placeholder="Subcategories (comma separated)"
                    value={newCatSubcategories}
                    onChange={(e) => setNewCatSubcategories(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </div>
              </form>

              {/* Category List */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
                  Configured Categories ({filteredCats.length})
                </div>

                <div className="space-y-2">
                  {filteredCats.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-2 transition hover:border-[rgb(var(--c-primary))]/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                            {cat.name}
                          </span>
                          {cat.isCustom && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))] text-[9px] font-heading font-bold">
                              Custom
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCatId(selectedCatId === cat.id ? null : cat.id)
                            }
                            className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] text-[10px] font-heading font-bold text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/30 transition"
                          >
                            {selectedCatId === cat.id ? 'Close' : 'Manage Subcategories'}
                          </button>
                          {cat.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                              title="Delete custom category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subcategories Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {cat.subcategories.map((sub) => (
                          <span
                            key={sub}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[11px] text-[rgb(var(--c-text))]"
                          >
                            <span>{sub}</span>
                            {selectedCatId === cat.id && cat.subcategories.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSubcategory(cat.id, sub)}
                                className="text-[rgb(var(--c-muted))] hover:text-rose-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Add Subcategory Input if expanded */}
                      {selectedCatId === cat.id && (
                        <div className="flex items-center gap-2 pt-2 border-t border-[rgb(var(--c-border))]/50">
                          <input
                            type="text"
                            placeholder="Add subcategory..."
                            value={newSubcatInput}
                            onChange={(e) => setNewSubcatInput(e.target.value)}
                            className="flex-1 px-3 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-text))]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubcategoryToCategory(cat.id)}
                            className="px-3 py-1 rounded-lg bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveCurrencies} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0 mt-0.5" />
                <p className="text-xs text-[rgb(var(--c-text))] font-flourish">
                  <strong>Preservation Rule:</strong> Historical transaction amounts and currencies are
                  never modified in database records. Configurable exchange rates are used strictly for
                  dynamic cross-currency summaries and unified net worth calculations.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1.5">
                  Primary Display Currency
                </label>
                <select
                  value={selectedPrimary}
                  onChange={(e) => setSelectedPrimary(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-sm font-heading font-bold text-[rgb(var(--c-text))]"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr} {curr === 'ETB' ? '(Ethiopian Birr - Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-2">
                  Exchange Rates (Relative to 1 ETB)
                </label>
                <div className="space-y-2 border border-[rgb(var(--c-border))] rounded-2xl p-3 bg-[rgb(var(--c-bg))]">
                  {SUPPORTED_CURRENCIES.filter((c) => c !== 'ETB').map((curr) => (
                    <div key={curr} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                        1 {curr} =
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={editableRates[curr] ?? 1}
                          onChange={(e) =>
                            setEditableRates({
                              ...editableRates,
                              [curr]: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-mono font-bold text-[rgb(var(--c-text))]"
                        />
                        <span className="font-mono text-[rgb(var(--c-muted))]">ETB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 shadow-xs"
                >
                  Save Currency Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
