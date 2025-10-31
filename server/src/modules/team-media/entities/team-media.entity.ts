import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { StoredFile } from '../../file-storage/entities/stored-file.entity';

@Entity('team_media')
export class TeamMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  teamId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  fileId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'uuid', nullable: true })
  userGroupId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => StoredFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: StoredFile;
}
