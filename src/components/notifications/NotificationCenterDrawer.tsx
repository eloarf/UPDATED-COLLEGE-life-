import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { NotificationCenterPanel } from './NotificationCenterPanel';
import { ArrowRight, Bell, X } from 'lucide-react';

export const NotificationCenterDrawer: React.FC = () => {
  const { isNotificationsOpen, setNotificationsOpen, setCurrentRoute } = useUiStore();

  if (!isNotificationsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
    >
      <div className="absolute inset-0" onClick={() => setNotificationsOpen(false)} />

      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[rgb(var(--c-primary))]" />
            <div>
              <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                Notifications
              </h2>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Due reminders, deadlines, and focus alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setCurrentRoute('#/notifications');
              }}
              className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-heading font-semibold text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-surface2))] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Full view</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto">
          <NotificationCenterPanel
            compact
            onCloseDrawer={() => setNotificationsOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};
