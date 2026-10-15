import { AASTUState, Assignment, ExamItem, TaskItem } from '../types/aastu';

/**
 * Formats a Date object into iCalendar standard format: YYYYMMDDTHHMMSSZ
 */
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Clean text for iCalendar standards (escaping commas, semicolons, and newlines)
 */
function cleanIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Generates an iCalendar (.ics) format string containing all assignments, exams, and weekly timetable
 */
export function generateIcsCalendar(state: AASTUState): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AASTU 4.0 & Creative OS//Academic Schedule Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AASTU 4.0 & Creative OS',
    'X-WR-TIMEZONE:Africa/Addis_Ababa',
    'X-WR-CALDESC:University class schedules, assignments, exams, and daily creative flow',
  ];

  const nowStr = formatIcsDate(new Date());

  // 1. Export Assignments with Pre-Set Notification Alarms (24h and 2h before)
  state.assignments.forEach((asg) => {
    const [year, month, day] = asg.dueDate.split('-').map(Number);
    const [hours, minutes] = asg.dueTime.split(':').map(Number);
    const dueDateTime = new Date(year, month - 1, day, hours, minutes);
    const startDateTime = new Date(dueDateTime.getTime() - 60 * 60 * 1000); // 1 hr duration

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:asg-${asg.id}@aastu-os.local`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART:${formatIcsDate(startDateTime)}`);
    lines.push(`DTEND:${formatIcsDate(dueDateTime)}`);
    lines.push(`SUMMARY:[DUE] ${cleanIcsText(asg.title)} (${asg.courseCode})`);
    lines.push(
      `DESCRIPTION:${cleanIcsText(
        `Course: ${asg.courseCode}\\nWeight: ${asg.weightPercentage || 0}% of grade\\nStatus: ${asg.status}\\n${
          asg.description || ''
        }`
      )}`
    );
    lines.push(`STATUS:${asg.status === 'submitted' ? 'COMPLETED' : 'CONFIRMED'}`);

    // Alarm 1: 1 Day Before
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Assignment due tomorrow: ${cleanIcsText(asg.title)}`);
    lines.push('TRIGGER:-P1D');
    lines.push('END:VALARM');

    // Alarm 2: 2 Hours Before
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Assignment due in 2 hours: ${cleanIcsText(asg.title)}`);
    lines.push('TRIGGER:-PT2H');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  // 2. Export Exams with Alarms (3 Days and 1 Day Before)
  state.exams.forEach((exam) => {
    const [year, month, day] = exam.examDate.split('-').map(Number);
    const [hours, minutes] = exam.examTime.split(':').map(Number);
    const startDateTime = new Date(year, month - 1, day, hours, minutes);
    const endDateTime = new Date(startDateTime.getTime() + (exam.durationMinutes || 120) * 60 * 1000);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:exam-${exam.id}@aastu-os.local`);
    lines.push(`DTSTAMP:${nowStr}`);
    lines.push(`DTSTART:${formatIcsDate(startDateTime)}`);
    lines.push(`DTEND:${formatIcsDate(endDateTime)}`);
    lines.push(`SUMMARY:[EXAM] ${cleanIcsText(exam.title)} (${exam.courseCode})`);
    if (exam.room) lines.push(`LOCATION:${cleanIcsText(exam.room)}`);
    lines.push(
      `DESCRIPTION:${cleanIcsText(
        `Course: ${exam.courseCode}\\nWeight: ${exam.weightPercentage || 0}%\\nReadiness: ${
          exam.readinessScore
        }%\\nRoom: ${exam.room || 'TBD'}`
      )}`
    );

    // Alarm 1: 3 Days Before
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Upcoming Exam in 3 Days: ${cleanIcsText(exam.title)}`);
    lines.push('TRIGGER:-P3D');
    lines.push('END:VALARM');

    // Alarm 2: 1 Day Before
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Tomorrow is your Exam: ${cleanIcsText(exam.title)} (${exam.room || ''})`);
    lines.push('TRIGGER:-P1D');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  // 3. Export Weekly Classes & Focus Blocks (Recurring Weekly)
  const dayOffsets: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dayByRuleMap: Record<string, string> = {
    Sun: 'SU',
    Mon: 'MO',
    Tue: 'TU',
    Wed: 'WE',
    Thu: 'TH',
    Fri: 'FR',
    Sat: 'SA',
  };

  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sun

  Object.entries(state.schedules).forEach(([day, tasks]) => {
    const targetDayIndex = dayOffsets[day] ?? 1;
    const diff = targetDayIndex - currentDayOfWeek;
    const baseDate = new Date(today);
    baseDate.setDate(today.getDate() + diff);

    tasks.forEach((task) => {
      // Parse time e.g. "08:30 - 10:20"
      const [startStr, endStr] = task.time.split('-').map((s) => s.trim());
      if (!startStr || !endStr) return;

      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);

      const eventStart = new Date(baseDate);
      eventStart.setHours(startH || 8, startM || 0, 0, 0);

      const eventEnd = new Date(baseDate);
      eventEnd.setHours(endH || startH + 1, endM || 0, 0, 0);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:task-${task.id}-${day}@aastu-os.local`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART:${formatIcsDate(eventStart)}`);
      lines.push(`DTEND:${formatIcsDate(eventEnd)}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${dayByRuleMap[day] || 'MO'}`);
      lines.push(`SUMMARY:${cleanIcsText(task.title)}`);
      if (task.location) lines.push(`LOCATION:${cleanIcsText(task.location)}`);
      lines.push(
        `DESCRIPTION:${cleanIcsText(`Category: ${task.category}\\nNotes: ${task.notes || 'AASTU 4.0 OS Scheduled Block'}`)}`
      );

      // Reminder 15 mins before for classes
      if (task.category === 'classes' || task.category === 'running') {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Starting in 15 min: ${cleanIcsText(task.title)}`);
        lines.push('TRIGGER:-PT15M');
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the complete .ics file
 */
export function downloadIcsFile(state: AASTUState, filename = 'AASTU_4.0_Creative_OS.ics'): void {
  const icsData = generateIcsCalendar(state);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Direct web URL to add an individual assignment or exam into Google Calendar
 */
export function createGoogleCalendarUrl(item: {
  title: string;
  details?: string;
  location?: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  durationMinutes?: number;
}): string {
  const [year, month, day] = item.dateStr.split('-').map(Number);
  const [hours, minutes] = item.timeStr.split(':').map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = new Date(startDate.getTime() + (item.durationMinutes || 60) * 60 * 1000);

  const startFormatted = formatIcsDate(startDate);
  const endFormatted = formatIcsDate(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.title,
    dates: `${startFormatted}/${endFormatted}`,
    details: item.details || 'AASTU 4.0 & Creative OS Scheduled Deliverable',
    location: item.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
