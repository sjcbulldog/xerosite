import {
  Entity,
  Column,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEmail } from './user-email.entity';
import { UserPhone } from './user-phone.entity';
import { UserAddress } from './user-address.entity';
import { UserState } from '../enums/user-state.enum';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'middle_name', length: 100, nullable: true })
  middleName?: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: UserState,
    default: UserState.PENDING,
  })
  state: UserState;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @OneToMany(() => UserEmail, (email) => email.user, {
    cascade: true,
    eager: true,
  })
  emails: UserEmail[];

  @OneToMany(() => UserPhone, (phone) => phone.user, {
    cascade: true,
    eager: true,
  })
  phones: UserPhone[];

  @OneToMany(() => UserAddress, (address) => address.user, {
    cascade: true,
    eager: true,
  })
  addresses: UserAddress[];

  @OneToMany('UserTeam', 'user')
  userTeams: any[];

  @BeforeInsert()
  async hashPasswordOnInsert() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate() {
    // Only hash if password doesn't look like it's already hashed (bcrypt hashes start with $2b$)
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }

  get primaryEmail(): string | undefined {
    return this.emails?.find((email) => email.isPrimary)?.email;
  }

  get primaryPhone(): string | undefined {
    return this.phones?.find((phone) => phone.isPrimary)?.phoneNumber;
  }

  get primaryAddress(): UserAddress | undefined {
    return this.addresses?.find((address) => address.isPrimary);
  }
}
