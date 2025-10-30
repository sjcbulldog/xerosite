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
    default: 'Administrator,Mentor,Student,Parent',
  })
  roles: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    default: null,
  })
  roleConstraints: string;

  @Column({
    type: 'enum',
    enum: TeamVisibility,
    default: TeamVisibility.PRIVATE,
  })
  visibility: TeamVisibility;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'America/New_York',
  })
  timezone: string;

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

  // Helper method to get role constraints as array of pairs
  getRoleConstraintsArray(): Array<[string, string]> {
    if (!this.roleConstraints) return [];
    
    return this.roleConstraints
      .split(',')
      .map((pair) => pair.trim())
      .filter((pair) => pair.includes(':'))
      .map((pair) => {
        const [role1, role2] = pair.split(':').map((r) => r.trim());
        return [role1, role2] as [string, string];
      });
  }

  // Helper method to set role constraints from array of pairs
  setRoleConstraintsArray(constraints: Array<[string, string]>): void {
    this.roleConstraints = constraints
      .map(([role1, role2]) => `${role1}:${role2}`)
      .join(',');
  }

  // Helper method to check if two roles are constrained (mutually exclusive)
  areRolesConstrained(role1: string, role2: string): boolean {
    const constraints = this.getRoleConstraintsArray();
    return constraints.some(
      ([r1, r2]) =>
        (r1 === role1 && r2 === role2) || (r1 === role2 && r2 === role1),
    );
  }

  // Helper method to get all roles that conflict with a given role
  getConflictingRoles(roleName: string): string[] {
    const constraints = this.getRoleConstraintsArray();
    const conflicting: string[] = [];

    for (const [role1, role2] of constraints) {
      if (role1 === roleName) {
        conflicting.push(role2);
      } else if (role2 === roleName) {
        conflicting.push(role1);
      }
    }

    return conflicting;
  }
}
