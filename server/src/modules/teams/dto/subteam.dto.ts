import { IsString, IsOptional, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class LeadPositionDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(100)
  requiredRole: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateSubteamDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  validRoles: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadPositionDto)
  leadPositions?: LeadPositionDto[];
}

export class UpdateSubteamDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  validRoles?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadPositionDto)
  leadPositions?: LeadPositionDto[];
}

export class AddSubteamMembersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class RemoveSubteamMemberDto {
  @IsString()
  userId: string;
}

export class UpdateLeadPositionDto {
  @IsString()
  positionId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class SubteamMemberDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  addedAt: Date;
}

export class SubteamLeadPositionDto {
  id: string;
  title: string;
  requiredRole: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

export class SubteamResponseDto {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  validRoles: string[];
  createdBy: string;
  members: SubteamMemberDto[];
  leadPositions: SubteamLeadPositionDto[];
  createdAt: Date;
  updatedAt: Date;
}
