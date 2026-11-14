import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  Channel,
  PermissionStatus,
  ActionPerformed,
} from '@capacitor/local-notifications';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'web-mode' | 'unavailable';

export const ANDROID_MAX_SCHEDULED_ALARMS = 50;

export const ACTION_TYPE_TASK = 'COLLEGE_OS_TASK_ACTIONS';
export const ACTION_TYPE_REMINDER = 'COLLEGE_OS_REMINDER_ACTIONS';

export interface NotificationEventCallbacks {
  onActionPerformed?: (payload: {
    actionId: string;
    id: number;
    extra?: Record<string, any>;
  }) => void | Promise<void>;
  onReceived?: (payload: {
    id: number;
    extra?: Record<string, any>;
  }) => void | Promise<void>;
}

export interface ChannelDefinition {
  id: string;
  name: string;
  description: string;
  importance: 1 | 2 | 3 | 4 | 5; // 3 = default, 4 = high, 5 = max
  sound?: string;
  vibration?: boolean;
}

export const NOTIFICATION_CHANNELS: ChannelDefinition[] = [
  {
    id: 'college_os_academic',
    name: 'Classes & Academic Reminders',
    description: 'Upcoming lectures, lab tutorials, and classroom start notifications.',
    importance: 4,
    vibration: true,
  },
  {
    id: 'college_os_deadlines',
    name: 'Exams & Major Deadlines',
    description: 'Critical exam alerts (3-day, 1-day, morning) and project submissions.',
    importance: 5,
    vibration: true,
  },
  {
    id: 'college_os_tasks',
    name: 'Tasks & Assignments',
    description: 'Daily quest reminders and assignment due dates.',
    importance: 3,
    vibration: true,
  },
  {
    id: 'college_os_habits',
    name: 'Habits & Routine Logging',
    description: 'Evening habit check-ins and streak preservation cues.',
    importance: 3,
    vibration: false,
  },
  {
    id: 'college_os_finance',
    name: 'Finance & Payment Due Dates',
    description: 'Debts owed, recurring subscription renewals, and bill alerts.',
    importance: 3,
    vibration: true,
  },
  {
    id: 'college_os_briefings',
    name: 'Daily Briefings & Reviews',
    description: 'Morning day-at-a-glance briefings and Sunday weekly audits.',
    importance: 3,
    vibration: false,
  },
  {
    id: 'college_os_focus',
    name: 'Focus Timer & Study Blocks',
    description: 'Pomodoro work session and break completion alerts.',
    importance: 4,
    vibration: true,
  },
  {
    id: 'college_os_goals',
    name: 'Academic Goals & Milestones',
    description: 'Upcoming semester goal target dates and milestone cues.',
    importance: 3,
    vibration: true,
  },
];

/**
 * Returns true strictly if running inside a native Android Capacitor container.
 * In desktop/mobile browser or PWA, returns false so web code never crashes.
 */
export const isNativeAndroid = (): boolean => {
  return typeof window !== 'undefined' &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'android';
};

/**
 * Generates a stable positive 31-bit integer for Capacitor LocalNotifications.
 * Deterministic hash ensures updating an event or task never generates duplicates.
 */
export function stringToNotificationId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const pos = Math.abs(hash) % 2147483647;
  return pos === 0 ? 1 : pos;
}

let isInitialized = false;
let registeredCallbacks: NotificationEventCallbacks = {};

/**
 * Registers callbacks from reminderEngine / UI layer so native notification
 * taps, inline actions, and foreground deliveries stay in sync with Dexie.
 */
export function registerNotificationEventCallbacks(callbacks: NotificationEventCallbacks): void {
  registeredCallbacks = { ...registeredCallbacks, ...callbacks };
}

/**
 * Initializes notification channels, interactive action buttons, and deep-link listeners on native Android.
 */
export async function initializeNotificationFoundation(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  if (!isNativeAndroid()) {
    console.debug('[NotificationFoundation] Running in Web/PWA mode; native Android alarms inactive.');
    return;
  }

  try {
    // Register all notification channels
    for (const ch of NOTIFICATION_CHANNELS) {
      const channel: Channel = {
        id: ch.id,
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        visibility: 1,
        vibration: ch.vibration ?? true,
      };
      await LocalNotifications.createChannel(channel);
    }

    // Register interactive notification action buttons for Android shade
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: ACTION_TYPE_TASK,
            actions: [
              { id: 'complete_task', title: 'Mark Done' },
              { id: 'snooze', title: 'Snooze' },
              { id: 'dismiss', title: 'Dismiss' },
            ],
          },
          {
            id: ACTION_TYPE_REMINDER,
            actions: [
              { id: 'snooze', title: 'Snooze' },
              { id: 'dismiss', title: 'Dismiss' },
            ],
          },
        ],
      });
    } catch (actionErr) {
      console.warn('[NotificationFoundation] Action types registration warning:', actionErr);
    }

    // Attach delivery listener when app is open/backgrounded
    await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      try {
        registeredCallbacks.onReceived?.({
          id: notification.id,
          extra: notification.extra,
        });
      } catch (err) {
        console.warn('[NotificationFoundation] Receive handler warning:', err);
      }
    });

    // Attach deep-link & interactive action listener
    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      async (action: ActionPerformed) => {
        try {
          const extra = action.notification.extra || {};
          if (registeredCallbacks.onActionPerformed) {
            await registeredCallbacks.onActionPerformed({
              actionId: action.actionId || 'tap',
              id: action.notification.id,
              extra,
            });
          } else if ((action.actionId === 'tap' || !action.actionId) && extra.route && typeof window !== 'undefined') {
            window.location.hash = extra.route;
          }
        } catch (err) {
          console.error('[NotificationFoundation] Action handler error:', err);
        }
      }
    );
  } catch (err) {
    console.error('[NotificationFoundation] Channel initialization error:', err);
  }
}

/**
 * Checks current notification permission on Android (accounting for Android 13+ POST_NOTIFICATIONS).
 */
export async function checkNotificationPermissionStatus(): Promise<{
  state: NotificationPermissionState;
  exactAlarmAvailable: boolean;
}> {
  if (!isNativeAndroid()) {
    return { state: 'web-mode', exactAlarmAvailable: false };
  }

  try {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    const displayState = status.display;

    let state: NotificationPermissionState = 'prompt';
    if (displayState === 'granted') {
      state = 'granted';
    } else if (displayState === 'denied') {
      state = 'denied';
    }

    // Check exact alarm permission where supported
    const exactAlarm = (status as any).exact_alarm === 'granted' || (status as any).exact_alarm === undefined;

    return { state, exactAlarmAvailable: exactAlarm };
  } catch (err) {
    console.warn('[NotificationFoundation] checkPermissions notice:', err);
    return { state: 'prompt', exactAlarmAvailable: false };
  }
}

/**
 * Contextually requests notification permission from the user when enabling reminders.
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  state: NotificationPermissionState;
  exactAlarmAvailable: boolean;
}> {
  if (!isNativeAndroid()) {
    return { granted: false, state: 'web-mode', exactAlarmAvailable: false };
  }

  try {
    // Ensure channels exist first
    await initializeNotificationFoundation();

    const result = await LocalNotifications.requestPermissions();
    const granted = result.display === 'granted';
    const state: NotificationPermissionState = granted ? 'granted' : 'denied';
    const exactAlarm = (result as any).exact_alarm === 'granted' || (result as any).exact_alarm === undefined;

    return { granted, state, exactAlarmAvailable: exactAlarm };
  } catch (err) {
    console.error('[NotificationFoundation] Request permissions error:', err);
    return { granted: false, state: 'denied', exactAlarmAvailable: false };
  }
}

export interface NativeNotificationOptions {
  id: number;
  title: string;
  body: string;
  at: Date;
  channelId?: string;
  route?: string;
  actionTypeId?: string;
  extra?: Record<string, any>;
  allowWhileIdle?: boolean;
}

/**
 * Schedules a native local notification with graceful fallback for exact/approximate alarms.
 */
export async function scheduleNativeLocalNotification(
  options: NativeNotificationOptions
): Promise<boolean> {
  if (!isNativeAndroid()) {
    console.debug(`[NotificationFoundation] [Web Mode] Queued reminder #${options.id} at ${options.at.toISOString()}: ${options.title}`);
    return true;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          channelId: options.channelId || 'college_os_academic',
          actionTypeId: options.actionTypeId,
          schedule: {
            at: options.at,
            allowWhileIdle: options.allowWhileIdle ?? true,
          },
          extra: {
            route: options.route || '#/',
            ...options.extra,
          },
          smallIcon: 'ic_stat_name',
          iconColor: '#7A2E4A',
        },
      ],
    });
    return true;
  } catch (err: any) {
    // If Android 12+ throws exact-alarm restriction, fallback to inexact schedule
    console.warn('[NotificationFoundation] Primary schedule attempt error, attempting approximate fallback:', err);
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: options.id,
            title: options.title,
            body: options.body,
            channelId: options.channelId || 'college_os_academic',
            actionTypeId: options.actionTypeId,
            schedule: {
              at: options.at,
              allowWhileIdle: false, // fallback to standard alarm
            },
            extra: {
              route: options.route || '#/',
              ...options.extra,
            },
          },
        ],
      });
      return true;
    } catch (fallbackErr) {
      console.error('[NotificationFoundation] Inexact fallback also failed:', fallbackErr);
      return false;
    }
  }
}

/**
 * Cancels a list of native notifications by their integer IDs.
 */
export async function cancelNativeLocalNotifications(ids: number[]): Promise<boolean> {
  if (!ids.length) return true;
  if (!isNativeAndroid()) {
    console.debug('[NotificationFoundation] [Web Simulated] Canceled notifications:', ids);
    return true;
  }

  try {
    await LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id })),
    });
    return true;
  } catch (err) {
    console.warn('[NotificationFoundation] Cancel notifications warning:', err);
    return false;
  }
}

/**
 * Fetches all currently pending native notifications from Android OS.
 */
export async function getPendingNativeNotifications(): Promise<number[]> {
  if (!isNativeAndroid()) return [];
  try {
    const res = await LocalNotifications.getPending();
    return (res.notifications || []).map((n) => n.id);
  } catch (err) {
    console.warn('[NotificationFoundation] getPending warning:', err);
    return [];
  }
}

/**
 * Fetches notification IDs currently shown/delivered in Android notification shade.
 */
export async function getDeliveredNativeNotificationIds(): Promise<number[]> {
  if (!isNativeAndroid()) return [];
  try {
    const res = await LocalNotifications.getDeliveredNotifications();
    return (res.notifications || []).map((n) => n.id);
  } catch (err) {
    console.warn('[NotificationFoundation] getDeliveredNotifications warning:', err);
    return [];
  }
}

/**
 * Provides clear offline Android settings guidance when POST_NOTIFICATIONS or exact alarms are disabled.
 */
export function getAndroidNotificationSettingsGuidance(): {
  title: string;
  steps: string[];
} {
  if (!isNativeAndroid()) {
    return {
      title: 'Web / PWA Notification Behavior',
      steps: [
        'In browser and installed PWA mode, reminders appear inside the in-app Notification Center instead of browser push popups.',
        'Install the Android APK for lock-screen and system shade alerts delivered by Android AlarmManager.',
      ],
    };
  }

  return {
    title: 'How to enable notifications on Android',
    steps: [
      'Open Android Settings > Apps > College Life OS > Notifications and turn on Allow notifications.',
      'Ensure categories (Classes, Exams, Tasks, Habits, Focus, Goals) are enabled.',
      'For exact timing during Doze mode, enable Alarms & reminders under Special app access.',
    ],
  };
}

/**
 * Fires a test notification to verify delivery, channel sound, and deep linking.
 */
export async function triggerTestNotification(delaySeconds: number = 2): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isNativeAndroid()) {
    return {
      success: true,
      message: 'Test alert added to your in-app Notification Center. Android APK installs also deliver a native system shade alert.',
    };
  }

  const { state } = await checkNotificationPermissionStatus();
  if (state !== 'granted') {
    const req = await requestNotificationPermission();
    if (!req.granted) {
      return {
        success: false,
        message: 'Notification permission was denied. Enable notifications in Android Settings > Apps > College Life OS.',
      };
    }
  }

  const testId = stringToNotificationId('test-notification-system-specimen');
  const fireDate = new Date(Date.now() + Math.max(1, delaySeconds) * 1000);

  const ok = await scheduleNativeLocalNotification({
    id: testId,
    title: 'College Life OS — Test Notification',
    body: 'Local reminders are operational. Tap to return to Reminder Settings.',
    at: fireDate,
    channelId: 'college_os_academic',
    route: '#/notification-settings',
    actionTypeId: ACTION_TYPE_REMINDER,
    extra: { isTest: true },
  });

  if (ok) {
    return {
      success: true,
      message: `Test notification scheduled! It will appear in ${delaySeconds} seconds in your Android notification shade.`,
    };
  } else {
    return {
      success: false,
      message: 'Failed to schedule test notification. Please verify Android permissions.',
    };
  }
}
