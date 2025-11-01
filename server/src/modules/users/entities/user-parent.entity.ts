import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ParentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('user_parents')
@Index('IDX_user_parents_userId', ['userId'])
@Index('IDX_user_parents_parentUserId', ['parentUserId'])
@Index('IDX_user_parents_parentEmail', ['parentEmail'])
@Index('UQ_user_parents_userId_parentEmail', ['userId', 'parentEmail'], { unique: true })
export class UserParent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'userId', type: 'varchar', length: 36, comment: 'The child user ID' })
  userId: string;

  @Column({
    name: 'parentUserId',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'The parent user ID (if they are registered)',
  })
  parentUserId: string | null;

  @Column({
    name: 'parentEmail',
    type: 'varchar',
    length: 255,
    comment: 'The parent email address',
  })
  parentEmail: string;

  @Column({
    type: 'enum',
    enum: ParentStatus,
    default: ParentStatus.PENDING,
    comment: 'Status of parent relationship',
  })
  status: ParentStatus;

  @Column({
    name: 'invitationSentAt',
    type: 'datetime',
    nullable: true,
    comment: 'When invitation email was sent',
  })
  invitationSentAt: Date | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parentUserId' })
  parentUser: User | null;
}
