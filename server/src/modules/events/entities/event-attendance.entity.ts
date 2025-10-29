import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamEvent } from './team-event.entity';
import { User } from '../../users/entities/user.entity';

export enum AttendanceStatus {
  YES = 'yes',
  NO = 'no',
  NOT_SURE = 'not-sure',
}

@Entity('event_attendance')
@Index('IDX_EVENT_USER_INSTANCE', ['eventId', 'userId', 'instanceDate'], {
  unique: true,
})
export class EventAttendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => TeamEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: TeamEvent;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // For recurring events, this represents the specific instance date
  // For non-recurring events, this matches the event's startDateTime
  @Column({ type: 'datetime' })
  instanceDate: Date;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.NOT_SURE,
  })
  attendance: AttendanceStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
