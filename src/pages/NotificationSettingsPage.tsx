import React from 'react';
import { Bell, ArrowLeft } from 'lucide-react';
import { useUiStore } from '../store/uiStore';
import { NotificationSettingsSection } from '../components/settings/NotificationSettingsSection';

export const NotificationSettingsPage: React.FC = () => {
  const { setCurrentRoute } = useUiStore();

  return (
    <div className="space-y-5 pb-20 animate-pop">
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
            Reminder &amp; Notification Settings
          </h1>
          <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
            Configure quiet hours, lead times, categories, snooze behavior, and Android alarm queue limits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentRoute('#/notifications')}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <Bell className="w-4 h-4" />
          <span>Back to Notification Center</span>
        </button>
      </div>

      <NotificationSettingsSection />
    </div>
  );
};
