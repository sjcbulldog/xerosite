import { Exclude, Expose } from 'class-transformer';
import { UserState } from '../enums/user-state.enum';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  middleName?: string;

  @Expose()
  lastName: string;

  @Exclude()
  password?: string;

  @Expose()
  state: UserState;

  @Expose()
  lastLogin?: Date;

  @Expose()
  primaryEmail?: string;

  @Expose()
  emails: any[];

  @Expose()
  phones: any[];

  @Expose()
  addresses: any[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }

  @Expose()
  get isSiteAdmin(): boolean {
    return this.state === UserState.ADMIN;
  }
}
