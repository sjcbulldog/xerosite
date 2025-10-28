export class EventNotificationResponse {
  timeBefore: number;
  method: 'email' | 'text';
}

export class PreferencesResponseDto {
  id: string;
  userId: string;
  eventNotifications: EventNotificationResponse[];
  messageDeliveryMethod: 'email' | 'text';
  createdAt: Date;
  updatedAt: Date;
}
