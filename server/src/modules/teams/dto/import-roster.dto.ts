import { IsArray, ValidateNested, IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipStatus } from '../enums/membership-status.enum';

export class RosterMemberDto {
  @IsOptional()
  @IsString()
  first?: string;

  @IsOptional()
  @IsString()
  last?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class ImportRosterDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterMemberDto)
  members: RosterMemberDto[];

  @IsOptional()
  @IsString()
  defaultPassword?: string;

  @IsOptional()
  @IsEnum(MembershipStatus)
  defaultStatus?: MembershipStatus;
}

export class ImportRosterResultDto {
  successful: number;
  failed: number;
  errors: Array<{ row: number; email?: string; error: string }>;
  created: Array<{ email: string; name: string }>;
  existing: Array<{ email: string; name: string }>;
}
