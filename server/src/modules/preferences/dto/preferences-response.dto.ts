export class EventNotificationResponse {
  timeBefore: number;
  method: 'email' | 'text';
}

export class PreferencesResponseDto {
  id: string;
  userId: string;
  eventNotifications: EventNotificationResponse[];
  createdAt: Date;
  updatedAt: Date;
}
