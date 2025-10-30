import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TeamEvent } from './team-event.entity';

@Entity('event_exclusions')
@Index(['eventId', 'excludedDate'], { unique: true })
export class EventExclusion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => TeamEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: TeamEvent;

  @Column({ type: 'datetime' })
  excludedDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
