import React from 'react';
import { Bell, Settings } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { NotificationCenterPanel } from '../components/notifications/NotificationCenterPanel';

export const NotificationsPage: React.FC = () => {
  const { setCurrentRoute } = useUiStore();

  return (
    <div className="space-y-5 pb-20 animate-pop">
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex items-center justify-center text-[rgb(var(--c-primary))] shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Notification Center
            </h1>
            <p className="text-xs text-[rgb(var(--c-muted))]">
              Upcoming reminders, overdue tasks, academic deadlines, and session alerts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCurrentRoute('#/notification-settings')}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Settings className="w-4 h-4" />
          <span>Reminder Settings</span>
        </button>
      </div>

      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-6">
        <NotificationCenterPanel />
      </div>
    </div>
  );
};
