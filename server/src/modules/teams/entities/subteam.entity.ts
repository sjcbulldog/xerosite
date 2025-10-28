import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { SubteamMember } from './subteam-member.entity';
import { SubteamLeadPosition } from './subteam-lead-position.entity';

@Entity('subteams')
export class Subteam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'team_id' })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'valid_roles', type: 'text' })
  validRoles: string; // Comma-separated list of roles valid for this subteam

  @Column({ name: 'created_by', nullable: false })
  createdBy: string; // User ID of creator

  @OneToMany(() => SubteamMember, (member) => member.subteam, { cascade: true })
  members: SubteamMember[];

  @OneToMany(() => SubteamLeadPosition, (position) => position.subteam, { cascade: true })
  leadPositions: SubteamLeadPosition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
