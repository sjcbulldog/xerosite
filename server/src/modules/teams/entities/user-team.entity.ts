import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from './team.entity';
import { MembershipStatus } from '../enums/membership-status.enum';

@Entity('user_teams')
export class UserTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 36 })
  teamId: string;

  @Column({ type: 'varchar', length: 500 })
  roles: string;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.PENDING,
  })
  status: MembershipStatus;

  @ManyToOne(() => User, (user) => user.userTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Team, (team) => team.userTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamId' })
  team: Team;

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

  // Helper method to check if user has a specific role on this team
  hasRole(roleName: string): boolean {
    return this.getRolesArray().includes(roleName);
  }

  // Helper method to add a role
  addRole(roleName: string): void {
    const currentRoles = this.getRolesArray();
    if (!currentRoles.includes(roleName)) {
      currentRoles.push(roleName);
      this.setRolesArray(currentRoles);
    }
  }

  // Helper method to remove a role
  removeRole(roleName: string): void {
    const currentRoles = this.getRolesArray();
    const filteredRoles = currentRoles.filter((role) => role !== roleName);
    this.setRolesArray(filteredRoles);
  }
}
