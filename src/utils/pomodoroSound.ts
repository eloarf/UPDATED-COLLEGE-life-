// Offline Audio and Notification synthesizer for Pomodoro Timer
// Runs 100% offline using standard Web Audio API and vibration/notification APIs.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a soothing, harmonic chime when a focus session or break completes.
 * @param type 'work_complete' for celebratory chime, 'break_complete' for gentle return-to-work chime
 */
export function playPomodoroChime(type: 'work_complete' | 'break_complete' = 'work_complete') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'work_complete') {
      // 4-note ascending major arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.65);
      });
    } else {
      // 2-note gentle chime: A4 (440Hz) -> E5 (659Hz)
      const notes = [440, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.75);
      });
    }
  } catch (err) {
    console.warn('Web Audio chime could not play:', err);
  }
}

/**
 * Trigger physical device vibration if supported by Android WebView / Browser
 */
export function triggerHaptic(pattern: number[] = [120, 60, 120]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration not allowed or supported
  }
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
  } catch {
    // Graceful fallback
  }
  return false;
}

/**
 * Send local browser/Android notification for timer completion
 */
export function sendLocalNotification(title: string, body: string) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
      });
    }
  } catch {
    // Graceful fallback
  }
}
