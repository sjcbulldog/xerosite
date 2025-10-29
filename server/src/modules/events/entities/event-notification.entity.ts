import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('event_notifications')
@Index('IDX_EVENT_USER_NOTIFICATION', ['eventId', 'userId', 'notificationTime'], { unique: true })
export class EventNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'notification_time', type: 'timestamp' })
  notificationTime: Date;

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt: Date;

  @Column({ name: 'notification_type', type: 'varchar', length: 20 })
  notificationType: 'email' | 'text';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
