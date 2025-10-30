/**
 * Utility functions for timezone-aware date handling in the frontend
 */

/**
 * Format a UTC date string to display in a specific timezone
 * @param utcDateString - UTC date string from backend
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Formatted date parts for display
 */
export function formatInTimezone(utcDateString: string, timezone: string): {
  date: string;
  time: string;
  dateTime: string;
} {
  const date = new Date(utcDateString);
  
  // Format date as YYYY-MM-DD in the target timezone
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const dateParts = dateFormatter.formatToParts(date);
  const year = dateParts.find(p => p.type === 'year')?.value || '';
  const month = dateParts.find(p => p.type === 'month')?.value || '';
  const day = dateParts.find(p => p.type === 'day')?.value || '';
  const dateString = `${year}-${month}-${day}`;
  
  // Format time as HH:MM in the target timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const timeString = timeFormatter.format(date);
  
  return {
    date: dateString,
    time: timeString,
    dateTime: `${dateString}T${timeString}`
  };
}

/**
 * Parse a date/time string as if it were in a specific timezone and return ISO string
 * This is used when sending data to the backend
 * @param dateString - Date string in format YYYY-MM-DD
 * @param timeString - Time string in format HH:MM
 * @param timezone - IANA timezone string
 * @returns ISO string that can be sent to backend
 */
export function parseInTimezone(dateString: string, timeString: string, timezone: string): string {
  // Create a date string in the format that will be interpreted in the target timezone
  const dateTimeString = `${dateString}T${timeString}:00`;
  
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a date in UTC that represents the same wall-clock time in the target timezone
  // First, create a date object with the given components
  const localDate = new Date(year, month - 1, day, hours, minutes, 0);
  
  // Format this date in the target timezone to see what the offset is
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Get the offset by comparing UTC time to timezone time
  const tzDate = new Date(formatter.format(new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))));
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const offset = tzDate.getTime() - utcDate.getTime();
  
  // Create a UTC date that, when displayed in the target timezone, shows the desired time
  const targetUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0) - offset);
  
  return targetUtc.toISOString();
}

/**
 * Get timezone abbreviation for display (e.g., "EST", "PST")
 * @param timezone - IANA timezone string
 * @returns Timezone abbreviation or offset
 */
export function getTimezoneAbbreviation(timezone: string): string {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(date);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
  
  return tzName;
}

/**
 * Get current date in a specific timezone as YYYY-MM-DD
 * @param timezone - IANA timezone string
 * @returns Date string in format YYYY-MM-DD
 */
export function getCurrentDateInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  
  return `${year}-${month}-${day}`;
}
