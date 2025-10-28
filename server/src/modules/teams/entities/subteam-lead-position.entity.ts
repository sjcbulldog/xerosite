import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Subteam } from './subteam.entity';

@Entity('subteam_lead_positions')
export class SubteamLeadPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subteam_id' })
  subteamId: string;

  @ManyToOne(() => Subteam, (subteam) => subteam.leadPositions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subteam_id' })
  subteam: Subteam;

  @Column({ length: 100 })
  title: string; // e.g., "Lead Programmer", "Mechanical Lead"

  @Column({ name: 'required_role', length: 100 })
  requiredRole: string; // Role required to fill this position

  @Column({ name: 'user_id', nullable: true })
  userId: string; // User assigned to this lead position (null if unfilled)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
