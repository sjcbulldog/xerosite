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
  // Parse the input string and treat it as being in the specified timezone
  // Input format: "2025-10-30T15:00:00" or "2025-10-30"
  
  // Extract date/time components
  const parts = dateString.split('T');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00:00';
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  // Build a UTC date with the given components
  const utcDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds || 0).padStart(2, '0')}Z`;
  const utcDate = new Date(utcDateString);
  
  // Now find out what this same wall-clock time is when formatted in the target timezone
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
  
  const formattedInTimezone = formatter.format(utcDate);
  
  // Parse the formatted string back to get the actual UTC time
  // formattedInTimezone will be like "10/30/2025, 08:00:00" for Pacific when UTC is "10/30/2025, 15:00:00"
  // The difference tells us the offset
  const [datePortion, timePortion] = formattedInTimezone.split(', ');
  const [tzMonth, tzDay, tzYear] = datePortion.split('/').map(Number);
  const [tzHours, tzMinutes, tzSeconds] = timePortion.split(':').map(Number);
  
  const tzTime = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHours, tzMinutes, tzSeconds);
  const utcTime = Date.UTC(year, month - 1, day, hours, minutes, seconds || 0);
  
  const offset = utcTime - tzTime;
  
  // Apply the offset to get the correct UTC time
  const correctUtcTime = utcTime + offset;
  
  return new Date(correctUtcTime);
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
