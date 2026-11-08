import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface RecordToDelete {
  type: 'transaction' | 'account' | 'budget' | 'goal' | 'debt' | 'recurring';
  id: string;
  title: string;
}

interface FinanceDeleteModalProps {
  recordToDelete: RecordToDelete | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const FinanceDeleteModal: React.FC<FinanceDeleteModalProps> = ({
  recordToDelete,
  onCancel,
  onConfirm,
}) => {
  if (!recordToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 text-rose-500">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
            Confirm Deletion
          </h3>
        </div>
        <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
          Are you sure you want to delete &ldquo;{recordToDelete.title}&rdquo;? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-xs font-heading font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white font-heading text-xs font-bold shadow-xs hover:bg-rose-600 cursor-pointer"
          >
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
};
