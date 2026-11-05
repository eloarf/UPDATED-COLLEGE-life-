import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  Channel,
  PermissionStatus,
  ActionPerformed,
} from '@capacitor/local-notifications';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'web-mode' | 'unavailable';

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

/**
 * Initializes notification channels and deep-link tap listeners on native Android.
 */
export async function initializeNotificationFoundation(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  if (!isNativeAndroid()) {
    console.debug('[NotificationFoundation] Running in Web Preview mode; native local notifications inactive.');
    return;
  }

  try {
    // Register all 6 notification channels
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

    // Attach deep-link action listener
    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: ActionPerformed) => {
        try {
          const route = action.notification.extra?.route;
          if (route && typeof window !== 'undefined') {
            console.log('[NotificationFoundation] Notification tapped, navigating to:', route);
            window.location.hash = route;
          }
        } catch (err) {
          console.error('[NotificationFoundation] Tap handler error:', err);
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
    console.debug(`[NotificationFoundation] [Web Simulated] Schedule #${options.id} at ${options.at.toISOString()}: ${options.title}`);
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
 * Fires a test notification to verify delivery, channel sound, and deep linking.
 */
export async function triggerTestNotification(delaySeconds: number = 2): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isNativeAndroid()) {
    return {
      success: true,
      message: 'Test simulated (Web Preview Mode). When built into the Android APK, a native system notification will appear in the Android notification shade.',
    };
  }

  const { state } = await checkNotificationPermissionStatus();
  if (state !== 'granted') {
    const req = await requestNotificationPermission();
    if (!req.granted) {
      return {
        success: false,
        message: 'Notification permission was denied. Please enable notifications in Android Settings for College Life OS.',
      };
    }
  }

  const testId = stringToNotificationId('test-notification-system-specimen');
  const fireDate = new Date(Date.now() + Math.max(1, delaySeconds) * 1000);

  const ok = await scheduleNativeLocalNotification({
    id: testId,
    title: '🔔 College Life OS — Test Notification',
    body: 'Local reminders are operational! Tap to return to College Life OS settings.',
    at: fireDate,
    channelId: 'college_os_academic',
    route: '#/settings',
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
