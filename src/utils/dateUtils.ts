export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDayKey(dayKey: string): Date {
  const parts = dayKey.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date();
}

export function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dayKeyOrIso: string): string {
  if (!dayKeyOrIso) return '';
  const d = parseDayKey(dayKeyOrIso.slice(0, 10));
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getEthiopicDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-ethiopic', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(date) + ' E.C.';
  } catch {
    // Algorithmic estimation fallback if Intl ethiopic is unsupported
    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1;
    const gDay = date.getDate();
    const ethYear = (gMonth < 9 || (gMonth === 9 && gDay < 11)) ? gYear - 8 : gYear - 7;
    return `Meskerem ${gDay}, ${ethYear} E.C.`;
  }
}

// 0 = Monday, 1 = Tuesday ... 6 = Sunday
export function getDayOfWeekIndex(date: Date = new Date()): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  return (day === 0 ? 6 : day - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function checkTimeClash(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export function getTimeGreeting(name: string = 'Scholar'): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export function formatMinutes(totalMins: number): string {
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
