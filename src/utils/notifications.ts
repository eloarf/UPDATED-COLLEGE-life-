import { AASTUState, NotificationAlert } from '../types/aastu';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Pleasant synthesized audio chime when completing a task
 */
export function playTaskDoneChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Bell 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Bell 2: G5 (783.99 Hz) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Ignore audio errors if blocked by browser policy
  }
}

/**
 * Gentle alert chime for notifications and due dates
 */
export function playAlertChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); // A5
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // Ignore
  }
}

/**
 * Checks browser notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Requests permission for desktop/mobile notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (e) {
    return false;
  }
}

/**
 * Sends a native desktop browser notification if granted
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '⚡',
        badge: '⚡',
        ...options,
      });
    } catch (e) {
      // In mobile or PWA contexts
    }
  }
}

/**
 * Scans state and identifies all approaching due dates, exams, and missed tasks
 */
export function scanAndGenerateAlerts(state: AASTUState): NotificationAlert[] {
  const alerts: NotificationAlert[] = [];
  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  // 1. Scan Assignments
  state.assignments.forEach((asg) => {
    if (asg.status === 'submitted') return;

    const [year, month, day] = asg.dueDate.split('-').map(Number);
    const [hours, minutes] = (asg.dueTime || '23:59').split(':').map(Number);
    const dueDateTime = new Date(year, month - 1, day, hours, minutes);
    const diffMs = dueDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) {
      alerts.push({
        id: `alert-overdue-${asg.id}`,
        type: 'overdue',
        title: `Overdue: ${asg.title}`,
        message: `Was due on ${asg.dueDate} at ${asg.dueTime} (${asg.courseCode}). Mark submitted once done!`,
        timestamp: Date.now(),
        read: false,
        priority: 'urgent',
        targetId: asg.id,
      });
    } else if (diffHours <= 24) {
      alerts.push({
        id: `alert-due-soon-${asg.id}`,
        type: 'due_soon',
        title: `Due Within 24h: ${asg.title}`,
        message: `Due in ${Math.max(1, Math.round(diffHours))} hours (${asg.dueTime} today/tomorrow).`,
        timestamp: Date.now(),
        read: false,
        priority: 'urgent',
        targetId: asg.id,
      });
    } else if (diffHours <= 72) {
      alerts.push({
        id: `alert-due-3d-${asg.id}`,
        type: 'due_soon',
        title: `Upcoming Deadline: ${asg.courseCode}`,
        message: `"${asg.title}" due in ${Math.round(diffHours / 24)} days (${asg.dueDate}).`,
        timestamp: Date.now(),
        read: false,
        priority: 'warning',
        targetId: asg.id,
      });
    }
  });

  // 2. Scan Upcoming Exams
  state.exams.forEach((exam) => {
    const [year, month, day] = exam.examDate.split('-').map(Number);
    const [hours, minutes] = (exam.examTime || '09:00').split(':').map(Number);
    const examDateTime = new Date(year, month - 1, day, hours, minutes);
    const diffDays = Math.ceil((examDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 7) {
      alerts.push({
        id: `alert-exam-${exam.id}`,
        type: 'exam_countdown',
        title: `Exam in ${diffDays === 0 ? 'TODAY' : `${diffDays} Days`}: ${exam.title}`,
        message: `Scheduled for ${exam.examDate} at ${exam.examTime} (${exam.room || 'Room TBD'}). Current syllabus readiness: ${exam.readinessScore}%.`,
        timestamp: Date.now(),
        read: false,
        priority: diffDays <= 2 ? 'urgent' : 'warning',
        targetId: exam.id,
      });
    }
  });

  // 3. Scan Missed Tasks from Yesterday
  const days: (keyof typeof state.schedules)[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];
  const yesterdayDayName = days[yesterday.getDay()];

  const yesterdayTasks = state.schedules[yesterdayDayName] || [];
  let uncompletedYesterday = 0;

  yesterdayTasks.forEach((t) => {
    const key = `${yesterdayKey}-${yesterdayDayName}-${t.id}`;
    if (!state.completedTasks[key]) {
      uncompletedYesterday++;
    }
  });

  if (uncompletedYesterday > 0 && !state.monthHistory[yesterdayKey]?.frozen) {
    alerts.push({
      id: `alert-missed-tasks-${yesterdayKey}`,
      type: 'missed_task',
      title: `Missed Tasks Yesterday (${uncompletedYesterday})`,
      message: `You had ${uncompletedYesterday} uncompleted items on ${yesterdayDayName}. Use a Streak Freeze to preserve your streak if needed!`,
      timestamp: Date.now(),
      read: false,
      priority: 'warning',
    });
  }

  return alerts;
}
