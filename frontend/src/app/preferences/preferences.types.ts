export interface EventNotification {
  timeBefore: number; // in minutes
  method: 'email' | 'text';
}

export interface UserPreferences {
  id: string;
  userId: string;
  eventNotifications: EventNotification[];
  messageDeliveryMethod: 'email' | 'text';
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePreferencesRequest {
  eventNotifications?: EventNotification[];
  messageDeliveryMethod?: 'email' | 'text';
}

// Helper to format time before event for display
export function formatTimeBefore(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

// Common time options for notifications
export const TIME_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];
