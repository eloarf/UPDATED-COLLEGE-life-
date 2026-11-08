import React from 'react';
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  PiggyBank,
  Coins,
  Plus,
  Edit2,
  LucideIcon,
} from 'lucide-react';
import { FinancialAccount, FinancialAccountType } from '../../types';
import { formatMoney } from '../../utils/financeEngine';
import { db } from '../../db/db';
import { useUiStore } from '../../store/uiStore';

const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, { label: string; icon: LucideIcon }> = {
  bank: { label: 'Bank Account', icon: Building2 },
  mobile_money: { label: 'Mobile Money', icon: Smartphone },
  cash: { label: 'Cash on Hand', icon: Banknote },
  savings: { label: 'Dedicated Savings', icon: PiggyBank },
  digital_wallet: { label: 'Digital Wallet', icon: Wallet },
  custom: { label: 'Custom Account', icon: Coins },
  other: { label: 'Other Account', icon: Coins },
};

interface FinanceAccountsViewProps {
  accounts: FinancialAccount[];
  accountBalances: Record<string, number>;
  primaryCurrency: string;
  onAddAccount: () => void;
  onEditAccount: (acc: FinancialAccount) => void;
  onDeleteAccount: (acc: FinancialAccount) => void;
}

export const FinanceAccountsView: React.FC<FinanceAccountsViewProps> = ({
  accounts,
  accountBalances,
  primaryCurrency,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}) => {
  const { showToast } = useUiStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
            Financial Accounts &amp; Wallets ({accounts.length})
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Manage your campus cash, Commercial Bank of Ethiopia (CBE), Telebirr, or savings accounts
          </p>
        </div>
        <button
          onClick={onAddAccount}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Account</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const balance = accountBalances[acc.id] || 0;
          const Icon = ACCOUNT_TYPE_LABELS[acc.accountType || acc.type || 'bank']?.icon || Wallet;
          return (
            <div
              key={acc.id}
              className={`p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 transition space-y-3 ${
                acc.isArchived
                  ? 'opacity-60 border-[rgb(var(--c-border))]'
                  : 'border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))]/40 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[rgb(var(--c-surface2))] flex items-center justify-center text-[rgb(var(--c-primary))]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      {acc.institution || acc.accountType || acc.type}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {acc.isDefault && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-heading font-bold">
                      Default
                    </span>
                  )}
                  <button
                    onClick={() => onEditAccount(acc)}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase">
                  Current Dynamic Balance
                </div>
                <div className="text-xl font-mono font-bold text-[rgb(var(--c-text))]">
                  {formatMoney(balance, acc.currency || primaryCurrency)}
                </div>
                <div className="text-[10px] font-mono text-[rgb(var(--c-muted))] mt-0.5">
                  Opening: {formatMoney(acc.openingBalance, acc.currency || primaryCurrency)}
                </div>
              </div>

              {acc.notes && (
                <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish italic">
                  &ldquo;{acc.notes}&rdquo;
                </p>
              )}

              <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center justify-between text-xs">
                <button
                  onClick={async () => {
                    await db.financialAccounts.update(acc.id, {
                      isArchived: !acc.isArchived,
                    });
                    showToast(acc.isArchived ? 'Account unarchived' : 'Account archived', 'info');
                  }}
                  className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                >
                  {acc.isArchived ? 'Unarchive' : 'Archive'}
                </button>

                <button
                  onClick={() => onDeleteAccount(acc)}
                  className="text-[10px] font-heading font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
