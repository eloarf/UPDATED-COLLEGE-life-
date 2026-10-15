import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { CheckCircle, AlertTriangle, Info, AlertOctagon, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClass = 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]';

        if (toast.type === 'success') {
          Icon = CheckCircle;
          colorClass = 'border-emerald-500 text-emerald-600 dark:text-emerald-400';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClass = 'border-amber-500 text-amber-600 dark:text-amber-400';
        } else if (toast.type === 'danger') {
          Icon = AlertOctagon;
          colorClass = 'border-rose-500 text-rose-600 dark:text-rose-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[rgb(var(--c-surface))] border shadow-lg text-xs animate-pop ${colorClass}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[rgb(var(--c-text))] font-medium break-words">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-md text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
