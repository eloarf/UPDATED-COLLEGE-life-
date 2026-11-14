import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../../store/uiStore';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../../types';
import {
  ANDROID_MAX_SCHEDULED_ALARMS,
  checkNotificationPermissionStatus,
  getAndroidNotificationSettingsGuidance,
  requestNotificationPermission,
  isNativeAndroid,
  NotificationPermissionState,
} from '../../services/notificationService';
import {
  createTestAppNotification,
  reconcileAllReminders,
  syncNotificationCenter,
} from '../../services/reminderEngine';
import {
  Bell,
  BellOff,
  CheckCircle,
  AlertTriangle,
  Clock,
  Moon,
  Calendar,
  BookOpen,
  CheckSquare,
  ShieldAlert,
  Wallet,
  Sparkles,
  RefreshCw,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
  Timer,
  Award,
} from 'lucide-react';

export const NotificationSettingsSection: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const scheduledReminders = useLiveQuery(() => db.scheduledReminders.toArray()) || [];

  const notifSettings: NotificationSettings =
    settings?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  const [permState, setPermState] = useState<NotificationPermissionState>('web-mode');
  const [exactAlarmAvailable, setExactAlarmAvailable] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showActiveQueue, setShowActiveQueue] = useState(false);

  const guidance = getAndroidNotificationSettingsGuidance();

  useEffect(() => {
    checkNotificationPermissionStatus().then((res) => {
      setPermState(res.state);
      setExactAlarmAvailable(res.exactAlarmAvailable);
    });
  }, []);

  const updateSettings = async (updater: (prev: NotificationSettings) => NotificationSettings) => {
    const next = updater({ ...notifSettings });
    await db.settings.update('current_user', { notificationSettings: next });
    reconcileAllReminders()
      .then(() => syncNotificationCenter())
      .catch(console.warn);
  };

  const handleToggleMaster = async () => {
    const nextEnabled = !notifSettings.enabled;

    if (nextEnabled && isNativeAndroid()) {
      const res = await requestNotificationPermission();
      setPermState(res.state);
      setExactAlarmAvailable(res.exactAlarmAvailable);
      if (!res.granted) {
        showToast(
          'Android notification permission denied. Alerts still appear in the in-app Notification Center.',
          'warning'
        );
      }
    }

    await updateSettings((prev) => ({
      ...prev,
      enabled: nextEnabled,
      permissionRequested: true,
    }));

    showToast(
      nextEnabled
        ? 'Reminders enabled cleanly on this device.'
        : 'Reminders paused. Pending scheduled alarms cleared.',
      'info'
    );
  };

  const handleRequestPermissionClick = async () => {
    const res = await requestNotificationPermission();
    setPermState(res.state);
    setExactAlarmAvailable(res.exactAlarmAvailable);
    if (res.granted) {
      showToast('Android notification permission granted!', 'success');
      reconcileAllReminders().catch(console.warn);
    } else {
      showToast(
        'Notification permission denied. Follow the Android Settings steps below to allow notifications.',
        'warning'
      );
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const res = await createTestAppNotification();
      showToast(res.message, res.success ? 'success' : 'warning');
    } catch (err: any) {
      showToast('Error sending test notification: ' + err.message, 'danger');
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunReconcile = async () => {
    setIsReconciling(true);
    try {
      const report = await reconcileAllReminders();
      await syncNotificationCenter();
      const capNote =
        report.cappedOverflowCount > 0
          ? ` (${report.nativeScheduledCount}/${ANDROID_MAX_SCHEDULED_ALARMS} OS alarm cap active, ${report.cappedOverflowCount} queued in-app)`
          : '';
      showToast(
        `Synced ${report.activeCount} reminders (${report.classesScheduled} classes, ${report.tasksScheduled} tasks, ${report.examsScheduled} exams, ${report.goalsScheduled} goals).${capNote}`,
        'success'
      );
    } catch (err: any) {
      showToast('Reconciliation failed: ' + err.message, 'danger');
    } finally {
      setIsReconciling(false);
    }
  };

  const nativeCount = Math.min(scheduledReminders.length, ANDROID_MAX_SCHEDULED_ALARMS);
  const overflowCount = Math.max(0, scheduledReminders.length - ANDROID_MAX_SCHEDULED_ALARMS);

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
      {/* Header & Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold">
            <Bell className="w-3.5 h-3.5" />
            Offline Reminders &amp; Notification Center
          </div>
          <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            Reminders &amp; Alert Channels
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            100% private and stored locally on this device with zero external servers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCurrentRoute('#/notifications')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] cursor-pointer"
          >
            Open Notification Center
          </button>

          <button
            type="button"
            onClick={handleToggleMaster}
            className={`min-h-[38px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs cursor-pointer ${
              notifSettings.enabled
                ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] hover:opacity-90 active:scale-95'
                : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            {notifSettings.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <span>{notifSettings.enabled ? 'Reminders Active' : 'Enable Reminders'}</span>
          </button>
        </div>
      </div>

      {/* Permission Status & Platform Info Banner */}
      <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))]">
              Delivery Status:
            </span>
            {permState === 'granted' ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Android Permission Granted
              </span>
            ) : permState === 'denied' ? (
              <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Android Permission Denied
              </span>
            ) : permState === 'web-mode' ? (
              <span className="text-xs font-semibold text-[rgb(var(--c-primary))] flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Web / PWA Mode (In-App Center)
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Permission Needed on Android
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {permState !== 'granted' && isNativeAndroid() && (
              <button
                type="button"
                onClick={handleRequestPermissionClick}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-[11px] font-bold transition hover:opacity-90 active:scale-95 cursor-pointer"
              >
                Allow Permission
              </button>
            )}

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestNotification}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] font-heading text-[11px] font-bold transition hover:border-[rgb(var(--c-primary))] active:scale-95 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{isTesting ? 'Sending...' : 'Test Notification'}</span>
            </button>

            <button
              type="button"
              disabled={isReconciling || !notifSettings.enabled}
              onClick={handleRunReconcile}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] font-heading text-[11px] font-bold transition hover:border-[rgb(var(--c-primary))] active:scale-95 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              title="Rescan database and sync all alarms"
            >
              <RefreshCw className={`w-3 h-3 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>Sync Reminders</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[rgb(var(--c-muted))] leading-relaxed">
          {permState === 'web-mode'
            ? 'In browser & PWA mode, alerts are surfaced inside the Notification Center without browser push popups. When installed as the Android APK, reminders schedule via Android LocalNotifications and AlarmManager offline.'
            : 'Reminders run on Android AlarmManager & LocalNotifications offline, survive device reboots, and support interactive Mark Done / Snooze / Dismiss actions.'}
        </p>

        {permState === 'denied' && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 text-xs space-y-1">
            <div className="font-heading font-bold text-rose-500">{guidance.title}</div>
            <ul className="list-disc pl-4 text-[11px] text-[rgb(var(--c-muted))] space-y-0.5">
              {guidance.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {exactAlarmAvailable && isNativeAndroid() && (
          <div className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 pt-0.5">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>Exact alarms supported · {nativeCount}/{ANDROID_MAX_SCHEDULED_ALARMS} native slots in use.</span>
          </div>
        )}
      </div>

      {notifSettings.enabled && (
        <>
          {/* Quiet Hours Configuration */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="font-heading text-xs font-bold text-[rgb(var(--c-text))]">
                  Quiet Hours (Do Not Disturb)
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={notifSettings.quietHours.enabled}
                  onChange={(e) =>
                    updateSettings((p) => ({
                      ...p,
                      quietHours: { ...p.quietHours, enabled: e.target.checked },
                    }))
                  }
                  className="accent-[rgb(var(--c-primary))]"
                />
                <span className="text-[11px] text-[rgb(var(--c-muted))] font-bold">Enabled</span>
              </label>
            </div>

            {notifSettings.quietHours.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))]">
                  <span className="text-[11px] text-[rgb(var(--c-muted))]">Quiet Starts:</span>
                  <input
                    type="time"
                    value={notifSettings.quietHours.start}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        quietHours: { ...p.quietHours, start: e.target.value },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-mono text-xs font-bold"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))]">
                  <span className="text-[11px] text-[rgb(var(--c-muted))]">Quiet Ends:</span>
                  <input
                    type="time"
                    value={notifSettings.quietHours.end}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        quietHours: { ...p.quietHours, end: e.target.value },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-mono text-xs font-bold"
                  />
                </div>

                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[rgb(var(--c-muted))]">
                    <input
                      type="checkbox"
                      checked={notifSettings.quietHours.allowUrgentExams}
                      onChange={(e) =>
                        updateSettings((p) => ({
                          ...p,
                          quietHours: { ...p.quietHours, allowUrgentExams: e.target.checked },
                        }))
                      }
                      className="accent-[rgb(var(--c-primary))]"
                    />
                    <span>Allow urgent morning exam alarms (07:00 AM) to bypass quiet hours</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Categories Grid */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
              Reminder Categories &amp; Lead Times
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Classes */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Classes &amp; Timetable
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.classes.enabled}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          classes: { ...p.categories.classes, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Lead Time:</span>
                  <select
                    disabled={!notifSettings.categories.classes.enabled}
                    value={notifSettings.categories.classes.leadTimeMinutes}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          classes: {
                            ...p.categories.classes,
                            leadTimeMinutes: Number(e.target.value),
                          },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  >
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={45}>45 minutes before</option>
                    <option value={60}>1 hour before</option>
                  </select>
                </div>
              </div>

              {/* Tasks */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Tasks &amp; Assignments
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.tasks.enabled}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          tasks: { ...p.categories.tasks, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Default Due Lead:</span>
                  <select
                    disabled={!notifSettings.categories.tasks.enabled}
                    value={notifSettings.categories.tasks.defaultLeadTime}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          tasks: {
                            ...p.categories.tasks,
                            defaultLeadTime: e.target.value as any,
                          },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  >
                    <option value="1d">1 day before (09:00 AM)</option>
                    <option value="1h">1 hour before due time</option>
                    <option value="due">At exact due time</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[rgb(var(--c-muted))] pt-0.5">
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.tasks.overdueReminders !== false}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          tasks: { ...p.categories.tasks, overdueReminders: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                  <span>Surface overdue tasks in Notification Center</span>
                </label>
              </div>

              {/* Exams & Projects */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Exams &amp; Projects
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.exams.enabled}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          exams: { ...p.categories.exams, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <p className="text-[10px] text-[rgb(var(--c-muted))]">
                  Alerts 3 days before, 1 day before, exam morning (07:00), and project deadlines.
                </p>
              </div>

              {/* Academic Goals */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Academic Goals
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.goals?.enabled !== false}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          goals: {
                            leadDays: p.categories.goals?.leadDays || [3, 1],
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <p className="text-[10px] text-[rgb(var(--c-muted))]">
                  Reminders 3 days and 1 day before active semester goal target dates.
                </p>
              </div>

              {/* Habits */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-lime-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Habits Check-in
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.habits.enabled}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          habits: { ...p.categories.habits, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Check-in Time:</span>
                  <input
                    type="time"
                    disabled={!notifSettings.categories.habits.enabled}
                    value={notifSettings.categories.habits.defaultTime}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          habits: { ...p.categories.habits, defaultTime: e.target.value },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Schedule Rule:</span>
                  <select
                    disabled={!notifSettings.categories.habits.enabled}
                    value={notifSettings.categories.habits.repeatMode ?? 'scheduled_only'}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          habits: {
                            ...p.categories.habits,
                            repeatMode: e.target.value as 'daily' | 'scheduled_only' | 'off',
                          },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  >
                    <option value="scheduled_only">Scheduled days only</option>
                    <option value="daily">Daily if pending</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>

              {/* Focus Sessions */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Focus Timer &amp; Breaks
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.focus?.enabled !== false}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          focus: {
                            notifyBreakEnd: p.categories.focus?.notifyBreakEnd ?? true,
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[rgb(var(--c-muted))]">
                  <input
                    type="checkbox"
                    disabled={notifSettings.categories.focus?.enabled === false}
                    checked={notifSettings.categories.focus?.notifyBreakEnd !== false}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          focus: {
                            enabled: p.categories.focus?.enabled ?? true,
                            notifyBreakEnd: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                  <span>Also notify when Pomodoro breaks finish</span>
                </label>
              </div>

              {/* Finance */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Finance &amp; Due Bills
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.finance.enabled}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          finance: { ...p.categories.finance, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <p className="text-[10px] text-[rgb(var(--c-muted))]">
                  Alerts 1 day before due dates (10:00 AM) for payables and recurring bills.
                </p>
              </div>

              {/* Achievements & Briefings */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Achievements &amp; Level Milestones
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.achievements?.enabled !== false}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          achievements: { enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <p className="text-[10px] text-[rgb(var(--c-muted))]">
                  Surface unlocked milestones inside Notification Center.
                </p>
              </div>

              {/* Morning Briefing */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Morning Briefing
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.dailyBriefing.enabled}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          dailyBriefing: { ...p.categories.dailyBriefing, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Briefing Time:</span>
                  <input
                    type="time"
                    disabled={!notifSettings.categories.dailyBriefing.enabled}
                    value={notifSettings.categories.dailyBriefing.time}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          dailyBriefing: { ...p.categories.dailyBriefing, time: e.target.value },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  />
                </div>
              </div>

              {/* Plan My Day Ritual */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Plan My Day Ritual
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.planMyDay?.enabled ?? true}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          planMyDay: {
                            time: p.categories.planMyDay?.time || '08:00',
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Morning Plan Reminder:</span>
                  <input
                    type="time"
                    disabled={!(notifSettings.categories.planMyDay?.enabled ?? true)}
                    value={notifSettings.categories.planMyDay?.time || '08:00'}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          planMyDay: {
                            enabled: p.categories.planMyDay?.enabled ?? true,
                            time: e.target.value,
                          },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  />
                </div>
              </div>

              {/* Evening Shutdown Ritual */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Evening Shutdown Ritual
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.categories.shutdownRitual?.enabled ?? true}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          shutdownRitual: {
                            time: p.categories.shutdownRitual?.time || '21:00',
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="accent-[rgb(var(--c-primary))]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[rgb(var(--c-muted))]">
                  <span>Evening Shutdown Time:</span>
                  <input
                    type="time"
                    disabled={!(notifSettings.categories.shutdownRitual?.enabled ?? true)}
                    value={notifSettings.categories.shutdownRitual?.time || '21:00'}
                    onChange={(e) =>
                      updateSettings((p) => ({
                        ...p,
                        categories: {
                          ...p.categories,
                          shutdownRitual: {
                            enabled: p.categories.shutdownRitual?.enabled ?? true,
                            time: e.target.value,
                          },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Snooze Options */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-heading font-bold text-[rgb(var(--c-text))]">
                Default Snooze Duration
              </div>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                Pause a reminder for this duration when tapping Snooze.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[5, 10, 15, 30].map((mins) => {
                const isSelected = notifSettings.snoozeDurationMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      updateSettings((p) => ({ ...p, snoozeDurationMinutes: mins }))
                    }
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] border-[rgb(var(--c-primary))] shadow-xs'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Scheduled Reminders Queue Accordion */}
          <div className="pt-2 border-t border-[rgb(var(--c-border))]">
            <button
              type="button"
              onClick={() => setShowActiveQueue(!showActiveQueue)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-left text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                <span>
                  Scheduled Queue ({scheduledReminders.length} total · {nativeCount}/{ANDROID_MAX_SCHEDULED_ALARMS} Android alarm slots)
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[rgb(var(--c-muted))] font-normal">
                <span>{showActiveQueue ? 'Hide' : 'Inspect'}</span>
                {showActiveQueue ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {overflowCount > 0 && (
              <p className="text-[11px] text-[rgb(var(--c-muted))] mt-1.5 px-1">
                Android limits pending system alarms to {ANDROID_MAX_SCHEDULED_ALARMS}. The soonest {ANDROID_MAX_SCHEDULED_ALARMS} alarms are scheduled on OS hardware; {overflowCount} later items remain queued in-app.
              </p>
            )}

            {showActiveQueue && (
              <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto pr-1">
                {scheduledReminders.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[rgb(var(--c-border))] text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
                    No pending alarms scheduled. Add a task due date, goal target date, exam, or class period to populate.
                  </div>
                ) : (
                  [...scheduledReminders]
                    .sort((a, b) => a.targetTime.localeCompare(b.targetTime))
                    .map((item) => {
                      const target = new Date(item.targetTime);
                      const isUpcoming = target.getTime() > Date.now();

                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 truncate">
                            <div className="font-heading font-bold text-[rgb(var(--c-text))] truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-[rgb(var(--c-muted))] font-mono truncate">
                              {item.body}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-[10px] font-mono tabular-nums font-bold ${isUpcoming ? 'text-[rgb(var(--c-primary))]' : 'text-stone-400'}`}>
                              {target.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[9px] uppercase text-[rgb(var(--c-muted))] font-mono">
                              {item.category}
                              {item.extra?.nativeScheduled === false ? ' · queued' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
