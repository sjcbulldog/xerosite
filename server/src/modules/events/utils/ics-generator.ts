import { TeamEvent } from '../entities/team-event.entity';

/**
 * Generate ICS (iCalendar) content for an event
 * @param event The team event to generate ICS for
 * @param method REQUEST for new events, CANCEL for cancellations
 * @param sequence Sequence number (should be 0 for new events, 1+ for updates/cancellations)
 * @param timezone The IANA timezone identifier (e.g., 'America/Los_Angeles')
 */
export function generateICS(
  event: TeamEvent,
  method: 'REQUEST' | 'CANCEL' = 'REQUEST',
  sequence: number = 0,
  timezone: string = 'America/New_York',
): string {
  const now = new Date();
  const timestamp = formatICSDateTime(now, timezone);
  const uid = `${event.id}@xerosite-frc-teams`;

  // For cancellations, ensure sequence is at least 1
  const effectiveSequence = method === 'CANCEL' ? Math.max(sequence, 1) : sequence;

  // Format dates with timezone
  const dtStart = formatICSDateTime(event.startDateTime, timezone);
  const dtEnd = event.endDateTime
    ? formatICSDateTime(event.endDateTime, timezone)
    : formatICSDateTime(new Date(event.startDateTime.getTime() + 60 * 60 * 1000), timezone); // Default 1 hour duration

  // Build the ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FRC Teams//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
  ];

  // Start VEVENT
  // Use floating time (no timezone) - times are in team's local timezone
  icsContent.push(
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSText(event.name)}`,
    `SEQUENCE:${effectiveSequence}`,
  );

  // Add description if present (not required for CANCEL but helpful)
  if (event.description) {
    icsContent.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  // Add location if present (not required for CANCEL but helpful)
  if (event.location) {
    icsContent.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  // Add status
  icsContent.push(`STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`);

  // Add recurrence rule if applicable
  if (event.recurrenceType && event.recurrenceType !== 'none') {
    const rrule = generateRRule(event, timezone);
    if (rrule) {
      icsContent.push(`RRULE:${rrule}`);
    }
  }

  // Close the event and calendar
  icsContent.push('END:VEVENT');
  icsContent.push('END:VCALENDAR');

  return icsContent.join('\r\n');
}

/**
 * Format a date for ICS format in local timezone (YYYYMMDDTHHMMSS without Z)
 * The date comes in as UTC from the database, we format it in the specified timezone
 */
function formatICSDateTime(date: Date, timezone: string): string {
  // Ensure we have a valid Date object
  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  }

  // Convert UTC date to timezone-specific date parts using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = getValue('year');
  const month = getValue('month');
  const day = getValue('day');
  const hours = getValue('hour');
  const minutes = getValue('minute');
  const seconds = getValue('second');

  const result = `${year}${month}${day}T${hours}${minutes}${seconds}`;

  return result;
}

/**
 * Generate VTIMEZONE component for the ICS file
 * This provides timezone information including DST rules
 */
function generateVTimezone(timezone: string): string[] {
  // Map common timezones to their TZID
  const timezoneComponents: string[] = ['BEGIN:VTIMEZONE', `TZID:${timezone}`];

  // Add timezone components based on timezone
  // For US timezones, include DST rules
  if (timezone.startsWith('America/')) {
    // Standard time (fall/winter)
    timezoneComponents.push(
      'BEGIN:STANDARD',
      'DTSTART:20241103T020000', // First Sunday in November at 2 AM
      'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
      'TZOFFSETFROM:-0700', // PDT offset (will be adjusted)
      'TZOFFSETTO:-0800', // PST offset (will be adjusted)
      'END:STANDARD',
    );

    // Daylight time (spring/summer)
    timezoneComponents.push(
      'BEGIN:DAYLIGHT',
      'DTSTART:20240310T020000', // Second Sunday in March at 2 AM
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
      'TZOFFSETFROM:-0800', // PST offset (will be adjusted)
      'TZOFFSETTO:-0700', // PDT offset (will be adjusted)
      'END:DAYLIGHT',
    );
  }

  timezoneComponents.push('END:VTIMEZONE');
  return timezoneComponents;
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/;/g, '\\;') // Escape semicolons
    .replace(/,/g, '\\,') // Escape commas
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, ''); // Remove carriage returns
}

/**
 * Generate RRULE (recurrence rule) for ICS format
 */
function generateRRule(event: TeamEvent, timezone: string): string | null {
  if (!event.recurrenceType || event.recurrenceType === 'none') {
    return null;
  }

  const parts: string[] = [];

  switch (event.recurrenceType) {
    case 'daily':
      parts.push('FREQ=DAILY');
      break;

    case 'weekly':
      parts.push('FREQ=WEEKLY');
      if (event.recurrencePattern) {
        // Pattern format: { daysOfWeek: [0,2,4] } for Sunday, Tuesday, Thursday
        if (typeof event.recurrencePattern === 'object' && event.recurrencePattern.daysOfWeek) {
          const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          const days = event.recurrencePattern.daysOfWeek
            .map((day: number) => dayMap[day])
            .filter((day: string) => day !== undefined)
            .join(',');
          if (days) {
            parts.push(`BYDAY=${days}`);
          }
        } else if (typeof event.recurrencePattern === 'string') {
          // Legacy string format: "MO,WE,FR"
          parts.push(`BYDAY=${event.recurrencePattern}`);
        }
      }
      break;

    case 'monthly':
      parts.push('FREQ=MONTHLY');
      if (event.recurrencePattern) {
        if (typeof event.recurrencePattern === 'object') {
          // Pattern format: { daysOfMonth: [1,15] }
          if (
            event.recurrencePattern.daysOfMonth &&
            Array.isArray(event.recurrencePattern.daysOfMonth)
          ) {
            parts.push(`BYMONTHDAY=${event.recurrencePattern.daysOfMonth.join(',')}`);
          }
          // Pattern format: { pattern: 'first-tuesday', 'last-thursday' }
          else if (event.recurrencePattern.pattern) {
            // Convert pattern like 'first-tuesday' to '1TU', 'last-thursday' to '-1TH'
            const patternStr = event.recurrencePattern.pattern.toLowerCase();
            const positionMap: { [key: string]: string } = {
              first: '1',
              second: '2',
              third: '3',
              fourth: '4',
              last: '-1',
            };
            const dayMap: { [key: string]: string } = {
              sunday: 'SU',
              monday: 'MO',
              tuesday: 'TU',
              wednesday: 'WE',
              thursday: 'TH',
              friday: 'FR',
              saturday: 'SA',
            };

            for (const [position, posValue] of Object.entries(positionMap)) {
              for (const [day, dayValue] of Object.entries(dayMap)) {
                if (patternStr.includes(position) && patternStr.includes(day)) {
                  parts.push(`BYDAY=${posValue}${dayValue}`);
                  break;
                }
              }
            }
          }
        } else if (typeof event.recurrencePattern === 'string') {
          // Legacy string format
          if (event.recurrencePattern.match(/^\d+$/)) {
            // Day of month
            parts.push(`BYMONTHDAY=${event.recurrencePattern}`);
          } else {
            // Relative day (e.g., "1MO" = first Monday, "-1FR" = last Friday)
            parts.push(`BYDAY=${event.recurrencePattern}`);
          }
        }
      }
      break;

    case 'custom':
      // For custom recurrence, try to extract meaningful RRULE if possible
      // Otherwise just mark as non-recurring
      if (event.recurrencePattern && typeof event.recurrencePattern === 'object') {
        if (event.recurrencePattern.frequency) {
          parts.push(`FREQ=${event.recurrencePattern.frequency.toUpperCase()}`);
        }
      }
      break;
  }

  // Add end date if specified
  if (event.recurrenceEndDate) {
    const until = formatICSDateTime(event.recurrenceEndDate, timezone);
    parts.push(`UNTIL=${until}`);
  }

  return parts.join(';');
}
