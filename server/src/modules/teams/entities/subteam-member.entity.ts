import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Subteam } from './subteam.entity';

@Entity('subteam_members')
export class SubteamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subteam_id' })
  subteamId: string;

  @ManyToOne(() => Subteam, (subteam) => subteam.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subteam_id' })
  subteam: Subteam;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
