import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { RecurrenceType } from '../enums/recurrence-type.enum';

@Entity('team_events')
export class TeamEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string;

  @Column({ type: 'datetime' })
  startDateTime: Date;

  @Column({ type: 'datetime', nullable: true })
  endDateTime: Date;

  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  recurrenceType: RecurrenceType;

  // JSON field to store recurrence pattern details
  // For weekly: { daysOfWeek: [0,2,4] } // Sunday, Tuesday, Thursday
  // For monthly: { daysOfMonth: [1,15] } or { pattern: 'first-tuesday', 'last-thursday' }
  // For daily: { interval: 1 } // every day, or { interval: 2 } for every other day
  @Column({ type: 'json', nullable: true })
  recurrencePattern: any;

  @Column({ type: 'datetime', nullable: true })
  recurrenceEndDate: Date;

  // Reference to user group for visibility (null means all team members can see)
  @Column({ type: 'uuid', nullable: true, name: 'user_group_id' })
  userGroupId: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
