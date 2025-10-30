/**
 * Timezone utility functions for converting between team timezone and UTC
 * 
 * Note: This is a simplified implementation. For production use, consider
 * using a library like 'luxon' or 'date-fns-tz' for more robust timezone handling.
 */

/**
 * Parse a date string as if it's in the given timezone and convert to UTC
 * 
 * @param dateString ISO date string (e.g., '2025-11-15T14:30:00')
 * @param timezone IANA timezone (e.g., 'America/New_York')
 * @returns Date object in UTC
 */
export function parseInTimezone(dateString: string, timezone: string): Date {
  // For now, we'll use a simple approach with Intl.DateTimeFormat
  // This assumes the input dateString is meant to be interpreted in the team's timezone
  
  // Parse the date components
  const date = new Date(dateString);
  
  // Get the timezone offset for this date in the team's timezone
  const offset = getTimezoneOffset(date, timezone);
  
  // Adjust the date by the offset to get UTC
  const utcTime = date.getTime() - offset;
  
  return new Date(utcTime);
}

/**
 * Convert a UTC date to a string representation in the given timezone
 * 
 * @param date UTC Date object
 * @param timezone IANA timezone (e.g., 'America/New_York')
 * @returns ISO string in the target timezone
 */
export function formatInTimezone(date: Date, timezone: string): string {
  // Get the timezone offset
  const offset = getTimezoneOffset(date, timezone);
  
  // Adjust the date by the offset
  const localTime = new Date(date.getTime() + offset);
  
  // Return ISO string (which will show the local time)
  return localTime.toISOString();
}

/**
 * Get the timezone offset in milliseconds for a given date in a timezone
 * 
 * @param date Date to check
 * @param timezone IANA timezone
 * @returns Offset in milliseconds
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  // Format the date in the target timezone
  const dateInTz = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  
  // Format the date in UTC
  const dateInUtc = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  
  // Parse both strings and calculate difference
  const tzTime = new Date(dateInTz).getTime();
  const utcTime = new Date(dateInUtc).getTime();
  
  return tzTime - utcTime;
}

/**
 * Get a user-friendly display of the timezone offset
 * 
 * @param timezone IANA timezone
 * @returns Offset string like 'UTC-5' or 'UTC+0'
 */
export function getTimezoneOffsetString(timezone: string): string {
  const now = new Date();
  const offset = getTimezoneOffset(now, timezone);
  const hours = Math.floor(Math.abs(offset) / (1000 * 60 * 60));
  const sign = offset >= 0 ? '+' : '-';
  
  return `UTC${sign}${hours}`;
}
