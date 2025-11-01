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

@Entity('team_roles')
export class TeamRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  teamId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ type: 'varchar', length: 50 })
  roleName: string;

  @Column({ type: 'boolean', default: false })
  isRemovable: boolean;

  @Column({ type: 'text', nullable: true })
  excludedRoles: string; // Comma-separated list of mutually exclusive role names

  @Column({ type: 'text', nullable: true })
  excludedGroups: string; // Comma-separated list of group identifiers

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to get excluded roles as array
  getExcludedRolesArray(): string[] {
    return this.excludedRoles ? this.excludedRoles.split(',').map((role) => role.trim()) : [];
  }

  // Helper method to set excluded roles from array
  setExcludedRolesArray(roles: string[]): void {
    this.excludedRoles = roles.length > 0 ? roles.join(',') : null;
  }

  // Helper method to get excluded groups as array
  getExcludedGroupsArray(): string[] {
    return this.excludedGroups ? this.excludedGroups.split(',').map((group) => group.trim()) : [];
  }

  // Helper method to set excluded groups from array
  setExcludedGroupsArray(groups: string[]): void {
    this.excludedGroups = groups.length > 0 ? groups.join(',') : null;
  }
}
