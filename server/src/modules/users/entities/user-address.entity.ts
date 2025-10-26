import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('user_addresses')
export class UserAddress extends BaseEntity {
  @Column({ name: 'address_type', length: 50, default: 'home' })
  addressType: string; // home, work, other

  @Column({ name: 'street_line_1', length: 255 })
  streetLine1: string;

  @Column({ name: 'street_line_2', length: 255, nullable: true })
  streetLine2?: string;

  @Column({ length: 100 })
  city: string;

  @Column({ name: 'state_province', length: 100 })
  stateProvince: string;

  @Column({ name: 'postal_code', length: 20 })
  postalCode: string;

  @Column({ length: 100 })
  country: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  get formattedAddress(): string {
    const lines = [
      this.streetLine1,
      this.streetLine2,
      `${this.city}, ${this.stateProvince} ${this.postalCode}`,
      this.country,
    ].filter(Boolean);
    return lines.join('\n');
  }
}
