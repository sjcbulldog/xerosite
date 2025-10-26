import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('user_phones')
export class UserPhone extends BaseEntity {
  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string;

  @Column({ name: 'phone_type', length: 50, default: 'mobile' })
  phoneType: string; // mobile, home, work, other

  @Column({ name: 'country_code', length: 5, default: '+1' })
  countryCode: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verification_code', length: 10, nullable: true })
  verificationCode?: string;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @ManyToOne(() => User, (user) => user.phones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  get formattedNumber(): string {
    return `${this.countryCode} ${this.phoneNumber}`;
  }
}
