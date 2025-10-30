import { TeamEvent } from '../entities/team-event.entity';

/**
 * Generate ICS (iCalendar) content for an event
 * @param event The team event to generate ICS for
 * @param method REQUEST for new events, CANCEL for cancellations
 * @param sequence Sequence number (should be 0 for new events, 1+ for updates/cancellations)
 */
export function generateICS(
  event: TeamEvent,
  method: 'REQUEST' | 'CANCEL' = 'REQUEST',
  sequence: number = 0,
): string {
  const now = new Date();
  const timestamp = formatICSDateTime(now);
  const uid = `${event.id}@xerosite-frc-teams`;
  
  // For cancellations, ensure sequence is at least 1
  const effectiveSequence = method === 'CANCEL' ? Math.max(sequence, 1) : sequence;
  
  // Format dates
  const dtStart = formatICSDateTime(event.startDateTime);
  const dtEnd = event.endDateTime 
    ? formatICSDateTime(event.endDateTime)
    : formatICSDateTime(new Date(event.startDateTime.getTime() + 60 * 60 * 1000)); // Default 1 hour duration

  // Build the ICS content
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FRC Teams//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSText(event.name)}`,
    `SEQUENCE:${effectiveSequence}`,
  ];

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
    const rrule = generateRRule(event);
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
 * Format a date for ICS format (YYYYMMDDTHHMMSSZ in UTC)
 */
function formatICSDateTime(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/;/g, '\\;')     // Escape semicolons
    .replace(/,/g, '\\,')     // Escape commas
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '');      // Remove carriage returns
}

/**
 * Generate RRULE (recurrence rule) for ICS format
 */
function generateRRule(event: TeamEvent): string | null {
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
          if (event.recurrencePattern.daysOfMonth && Array.isArray(event.recurrencePattern.daysOfMonth)) {
            parts.push(`BYMONTHDAY=${event.recurrencePattern.daysOfMonth.join(',')}`);
          }
          // Pattern format: { pattern: 'first-tuesday', 'last-thursday' }
          else if (event.recurrencePattern.pattern) {
            // Convert pattern like 'first-tuesday' to '1TU', 'last-thursday' to '-1TH'
            const patternStr = event.recurrencePattern.pattern.toLowerCase();
            const positionMap: { [key: string]: string } = {
              'first': '1',
              'second': '2',
              'third': '3',
              'fourth': '4',
              'last': '-1',
            };
            const dayMap: { [key: string]: string } = {
              'sunday': 'SU',
              'monday': 'MO',
              'tuesday': 'TU',
              'wednesday': 'WE',
              'thursday': 'TH',
              'friday': 'FR',
              'saturday': 'SA',
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
    const until = formatICSDateTime(event.recurrenceEndDate);
    parts.push(`UNTIL=${until}`);
  }

  return parts.join(';');
}
