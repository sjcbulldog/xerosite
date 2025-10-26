import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserTeam } from './user-team.entity';
import { TeamVisibility } from '../enums/team-visibility.enum';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', unsigned: true })
  teamNumber: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    length: 500,
    default: 'admin,Mentor,Student,Parent',
  })
  roles: string;

  @Column({
    type: 'enum',
    enum: TeamVisibility,
    default: TeamVisibility.PRIVATE,
  })
  visibility: TeamVisibility;

  @OneToMany(() => UserTeam, (userTeam) => userTeam.team, {
    cascade: true,
  })
  userTeams: UserTeam[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper method to get roles as array
  getRolesArray(): string[] {
    return this.roles ? this.roles.split(',').map((role) => role.trim()) : [];
  }

  // Helper method to set roles from array
  setRolesArray(roles: string[]): void {
    this.roles = roles.join(',');
  }

  // Helper method to validate role name format
  static isValidRoleName(roleName: string): boolean {
    return /^[a-zA-Z0-9\s\-_]+$/.test(roleName);
  }

  // Helper method to validate all roles
  validateRoles(): boolean {
    const rolesArray = this.getRolesArray();
    return rolesArray.every((role) => Team.isValidRoleName(role));
  }
}
