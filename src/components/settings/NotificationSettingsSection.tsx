import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../../store/uiStore';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  ScheduledReminderRecord,
} from '../../types';
import {
  checkNotificationPermissionStatus,
  requestNotificationPermission,
  triggerTestNotification,
  isNativeAndroid,
  NotificationPermissionState,
} from '../../services/notificationService';
import { reconcileAllReminders } from '../../services/reminderEngine';
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
} from 'lucide-react';

export const NotificationSettingsSection: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const scheduledReminders = useLiveQuery(() => db.scheduledReminders.toArray()) || [];

  const notifSettings: NotificationSettings =
    settings?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  const [permState, setPermState] = useState<NotificationPermissionState>('web-mode');
  const [exactAlarmAvailable, setExactAlarmAvailable] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showActiveQueue, setShowActiveQueue] = useState(false);

  useEffect(() => {
    checkNotificationPermissionStatus().then((res) => {
      setPermState(res.state);
      setExactAlarmAvailable(res.exactAlarmAvailable);
    });
  }, []);

  const updateSettings = async (updater: (prev: NotificationSettings) => NotificationSettings) => {
    const next = updater({ ...notifSettings });
    await db.settings.update('current_user', { notificationSettings: next });
    // Trigger background reconciliation on any setting change
    reconcileAllReminders().catch(console.warn);
  };

  const handleToggleMaster = async () => {
    const nextEnabled = !notifSettings.enabled;

    if (nextEnabled && isNativeAndroid()) {
      const res = await requestNotificationPermission();
      setPermState(res.state);
      setExactAlarmAvailable(res.exactAlarmAvailable);
      if (!res.granted) {
        showToast('Android notification permission was denied. Please allow notifications in Android settings.', 'warning');
      }
    }

    await updateSettings((prev) => ({
      ...prev,
      enabled: nextEnabled,
      permissionRequested: true,
    }));

    showToast(
      nextEnabled
        ? 'Local reminders enabled! Alarms scheduled locally on this device.'
        : 'Local reminders disabled. All pending device alarms cleared.',
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
      showToast('Notification permission denied by user.', 'warning');
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const res = await triggerTestNotification(2);
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
      showToast(
        `Reconciled: ${report.activeCount} reminders scheduled (${report.classesScheduled} classes, ${report.tasksScheduled} tasks, ${report.examsScheduled} exams).`,
        'success'
      );
    } catch (err: any) {
      showToast('Reconciliation failed: ' + err.message, 'danger');
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
      {/* Header & Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold">
            <Bell className="w-3.5 h-3.5" />
            Native Device Notifications
          </div>
          <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            Offline Reminders &amp; Alarms
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            100% offline, private reminders scheduled directly on your device hardware.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleMaster}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs ${
            notifSettings.enabled
              ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] hover:opacity-90 active:scale-95'
              : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
          }`}
        >
          {notifSettings.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          <span>{notifSettings.enabled ? 'Reminders Active' : 'Enable Reminders'}</span>
        </button>
      </div>

      {/* Permission Status & Platform Info Banner */}
      <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))]">
              Android System Status:
            </span>
            {permState === 'granted' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Granted &amp; Active
              </span>
            ) : permState === 'denied' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Permission Denied
              </span>
            ) : permState === 'web-mode' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/30 font-bold flex items-center gap-1">
                <Info className="w-3 h-3" /> Web Preview Mode
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Action Needed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {permState !== 'granted' && isNativeAndroid() && (
              <button
                type="button"
                onClick={handleRequestPermissionClick}
                className="px-2.5 py-1 rounded-lg bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-[11px] font-bold transition hover:opacity-90 active:scale-95"
              >
                Allow Permission
              </button>
            )}

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestNotification}
              className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] font-heading text-[11px] font-bold transition hover:border-[rgb(var(--c-primary))] active:scale-95 disabled:opacity-50 flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{isTesting ? 'Sending...' : 'Test Notification'}</span>
            </button>

            <button
              type="button"
              disabled={isReconciling || !notifSettings.enabled}
              onClick={handleRunReconcile}
              className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] font-heading text-[11px] font-bold transition hover:border-[rgb(var(--c-primary))] active:scale-95 disabled:opacity-50 flex items-center gap-1"
              title="Rescan database and sync all alarms"
            >
              <RefreshCw className={`w-3 h-3 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>Sync Reminders</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
          {permState === 'web-mode'
            ? 'College Life OS uses native Android alarms when installed as a standalone APK. In browser/PWA mode, web push is disabled to preserve your battery and ensure zero remote server telemetry.'
            : 'Reminders run entirely on Android AlarmManager and LocalNotifications. They work with no internet connection, survive phone reboots, and deep-link directly into your lectures, quests, and budgets.'}
        </p>

        {exactAlarmAvailable && isNativeAndroid() && (
          <div className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 pt-1">
            <CheckCircle className="w-3 h-3 shrink-0" />
            <span>High-precision hardware alarms supported (Android 12+ Exact Alarms).</span>
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
                  Quiet Hours (Sleep &amp; Do Not Disturb)
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
              {/* Category 1: Classes */}
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
                    <option value={30}>30 minutes before (Default)</option>
                    <option value={45}>45 minutes before</option>
                    <option value={60}>1 hour before</option>
                  </select>
                </div>
              </div>

              {/* Category 2: Tasks */}
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
              </div>

              {/* Category 3: Exams & Deadlines */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Exams &amp; Major Deadlines
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
                <p className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                  Alerts: 3 days before, 1 day before, and exam morning (07:00 AM).
                </p>
              </div>

              {/* Category 4: Habits */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-lime-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Habits &amp; Daily Rituals
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
                  <span>Evening Check-in Time:</span>
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
              </div>

              {/* Category 5: Finance */}
              <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Finance &amp; Due Debts
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
                <p className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                  Alerts: 1 day before due date at 10:00 AM for payables and recurring bills.
                </p>
              </div>

              {/* Category 6: Daily Briefing & Weekly Review */}
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
            </div>
          </div>

          {/* Snooze Options */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-heading font-bold text-[rgb(var(--c-text))]">
                Default Snooze Duration
              </div>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                When postponing a reminder, pause alerts for this duration.
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
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition ${
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
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-left text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                <span>
                  Active Scheduled Device Alarms ({scheduledReminders.length})
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[rgb(var(--c-muted))] font-normal">
                <span>{showActiveQueue ? 'Hide List' : 'Inspect Queue'}</span>
                {showActiveQueue ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showActiveQueue && (
              <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto pr-1">
                {scheduledReminders.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-[rgb(var(--c-border))] text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
                    No pending alarms scheduled. Add a task due date, schedule an exam, or add class periods to populate.
                  </div>
                ) : (
                  scheduledReminders.map((item) => {
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
                          <div className={`text-[10px] font-mono font-bold ${isUpcoming ? 'text-[rgb(var(--c-primary))]' : 'text-stone-400'}`}>
                            {target.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] font-mono">
                            {item.category}
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
