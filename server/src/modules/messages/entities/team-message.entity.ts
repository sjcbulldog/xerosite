import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

export enum MessageRecipientType {
  ALL_TEAM_MEMBERS = 'ALL_TEAM_MEMBERS',
  USER_GROUP = 'USER_GROUP',
}

interface RecipientDetails {
  recipientCount: number;
  recipientEmails: string[];
}

@Entity('team_messages')
export class TeamMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  teamId: string;

  @Column('uuid')
  senderId: string;

  @Column({ length: 255 })
  subject: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageRecipientType,
  })
  recipientType: MessageRecipientType;

  @Column('uuid', { nullable: true })
  userGroupId?: string;

  @Column('json', { nullable: true })
  recipientDetails?: RecipientDetails;

  // Array of file IDs stored in the file storage system
  @Column('simple-array', { nullable: true })
  attachmentFileIds?: string[];

  // Array of user IDs who have viewed the message attachments
  @Column('simple-array', { nullable: true })
  viewedByRecipients?: string[];

  @Column('timestamp', { nullable: true })
  sentAt?: Date;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
