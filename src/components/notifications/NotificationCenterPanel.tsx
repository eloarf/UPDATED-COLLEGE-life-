import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useUiStore } from '../../store/uiStore';
import { AppNotification, NotificationCategory } from '../../types';
import { formatDisplayDate } from '../../utils/dateUtils';
import { isNativeAndroid } from '../../services/notificationService';
import {
  clearReadNotifications,
  completeTaskFromNotification,
  dismissNotification,
  isNotificationVisibleInCenter,
  markAllNotificationsRead,
  markNotificationRead,
  reconcileAllReminders,
  snoozeAppNotification,
  syncNotificationCenter,
} from '../../services/reminderEngine';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from 'lucide-react';

interface NotificationCenterPanelProps {
  onCloseDrawer?: () => void;
  compact?: boolean;
}

const CATEGORY_LABELS: { id: 'all' | NotificationCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'academics', label: 'Academics' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'habits', label: 'Habits' },
  { id: 'focus', label: 'Focus' },
  { id: 'goals', label: 'Goals' },
  { id: 'finance', label: 'Finance' },
  { id: 'briefings', label: 'Briefings' },
];

function formatNotificationTimestamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dayStr = formatDisplayDate(iso.slice(0, 10));
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dayStr} · ${timeStr}`;
}

export const NotificationCenterPanel: React.FC<NotificationCenterPanelProps> = ({
  onCloseDrawer,
  compact = false,
}) => {
  const { setCurrentRoute, showToast } = useUiStore();
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | NotificationCategory>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const rawNotifications = useLiveQuery(() => db.appNotifications.toArray(), []) || [];
  const defaultSnooze = settings?.notificationSettings?.snoozeDurationMinutes || 10;

  const visibleNotifications = useMemo(() => {
    const nowMs = Date.now();
    return rawNotifications
      .filter((n) => isNotificationVisibleInCenter(n, nowMs))
      .sort((a, b) => {
        const aKey = a.scheduledFor || a.createdAt || '';
        const bKey = b.scheduledFor || b.createdAt || '';
        return bKey.localeCompare(aKey);
      });
  }, [rawNotifications]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.isRead).length,
    [visibleNotifications]
  );

  const readCount = useMemo(
    () => visibleNotifications.filter((n) => n.isRead).length,
    [visibleNotifications]
  );

  const filteredNotifications = useMemo(() => {
    return visibleNotifications.filter((n) => {
      if (readFilter === 'unread' && n.isRead) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      return true;
    });
  }, [visibleNotifications, readFilter, categoryFilter]);

  const handleOpenItem = async (item: AppNotification) => {
    if (!item.isRead) {
      await markNotificationRead(item.id);
    }
    if (onCloseDrawer) onCloseDrawer();
    setCurrentRoute(item.route || '#/');
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await reconcileAllReminders();
      await syncNotificationCenter();
      showToast('Notifications & reminders refreshed.', 'success');
    } catch {
      showToast('Could not refresh notifications.', 'danger');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCompleteTask = async (e: React.MouseEvent, item: AppNotification) => {
    e.stopPropagation();
    const ok = await completeTaskFromNotification(item);
    if (ok) {
      showToast('Task marked complete.', 'success');
    }
  };

  const handleSnooze = async (e: React.MouseEvent, item: AppNotification) => {
    e.stopPropagation();
    await snoozeAppNotification(item.id, defaultSnooze);
    showToast(`Snoozed for ${defaultSnooze} minutes.`, 'info');
  };

  const handleMarkRead = async (e: React.MouseEvent, item: AppNotification) => {
    e.stopPropagation();
    await markNotificationRead(item.id);
  };

  const handleDismiss = async (e: React.MouseEvent, item: AppNotification) => {
    e.stopPropagation();
    await dismissNotification(item.id);
  };

  const handleOpenSettings = () => {
    if (onCloseDrawer) onCloseDrawer();
    setCurrentRoute('#/notification-settings');
  };

  return (
    <div className="space-y-4">
      {/* Platform clarity bar */}
      <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <p className="text-[11px] text-[rgb(var(--c-muted))] leading-relaxed">
          {isNativeAndroid()
            ? 'Android APK: local alerts appear in your notification shade and collect here offline.'
            : 'Web / PWA mode: alerts collect here offline without browser push prompts. Install the Android APK for system lock-screen alerts.'}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setReadFilter('all')}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition cursor-pointer ${
              readFilter === 'all'
                ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))]'
                : 'bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            All ({visibleNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setReadFilter('unread')}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition cursor-pointer ${
              readFilter === 'unread'
                ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))]'
                : 'bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-heading font-semibold text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-surface2))] inline-flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          {readCount > 0 && (
            <button
              type="button"
              onClick={() => clearReadNotifications()}
              className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {CATEGORY_LABELS.map((cat) => {
          const active = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-heading font-semibold border transition shrink-0 cursor-pointer ${
                active
                  ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Notification List or Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] flex items-center justify-center mx-auto">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            {readFilter === 'unread' ? 'No unread notifications' : 'All caught up'}
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] max-w-sm mx-auto">
            {visibleNotifications.length === 0
              ? 'Upcoming classes, task deadlines, exams, goals, and focus completions will appear here when due.'
              : 'Try switching filters or open Reminder Settings to configure alerts.'}
          </p>
        </div>
      ) : (
        <div className={`space-y-2.5 ${compact ? 'max-h-[55vh] overflow-y-auto pr-1' : ''}`}>
          {filteredNotifications.map((item) => {
            const categoryLabel =
              CATEGORY_LABELS.find((c) => c.id === item.category)?.label || item.category;
            const timeLabel = formatNotificationTimestamp(item.scheduledFor || item.createdAt);
            const isTaskActionable =
              (item.actionType === 'complete_task' || item.category === 'tasks') && Boolean(item.entityId);

            return (
              <div
                key={item.id}
                onClick={() => handleOpenItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenItem(item);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2 ${
                  item.isRead
                    ? 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] opacity-80 hover:opacity-100'
                    : 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-[11px] font-mono text-[rgb(var(--c-muted))] flex items-center gap-1.5 flex-wrap">
                      <span className="uppercase font-heading font-bold text-[rgb(var(--c-primary))]">
                        {categoryLabel}
                      </span>
                      {timeLabel && <span>· {timeLabel}</span>}
                      {item.priority === 'high' && (
                        <span className="text-rose-500 font-semibold">· Urgent</span>
                      )}
                      {!item.isRead && (
                        <span className="text-[rgb(var(--c-text))] font-semibold">· New</span>
                      )}
                    </div>
                    <h4 className="text-sm font-heading font-bold text-[rgb(var(--c-text))] leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[rgb(var(--c-muted))] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDismiss(e, item)}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] shrink-0 cursor-pointer"
                    title="Dismiss notification"
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[rgb(var(--c-border))]/50">
                  {isTaskActionable && (
                    <button
                      type="button"
                      onClick={(e) => handleCompleteTask(e, item)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Complete Task</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleSnooze(e, item)}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Snooze {defaultSnooze}m</span>
                  </button>

                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkRead(e, item)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
