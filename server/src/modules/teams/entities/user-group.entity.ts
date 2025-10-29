import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';

@Entity('user_groups')
export class UserGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'team_id', type: 'uuid' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  // Store visibility rules as JSON (same format as calendar events)
  @Column({ name: 'visibility_rules', type: 'json', nullable: true })
  visibilityRules: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
