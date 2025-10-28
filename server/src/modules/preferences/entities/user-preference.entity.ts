import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface EventNotification {
  timeBefore: number; // in minutes
  method: 'email' | 'text';
}

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'json', nullable: true })
  eventNotifications: EventNotification[];

  @Column({ type: 'varchar', length: 10, default: 'email' })
  messageDeliveryMethod: 'email' | 'text';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
