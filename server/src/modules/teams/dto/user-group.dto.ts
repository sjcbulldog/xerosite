import { IsString, IsBoolean, IsOptional, MaxLength, IsObject } from 'class-validator';

export class CreateUserGroupDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isPublic: boolean;

  @IsObject()
  @IsOptional()
  visibilityRules?: any;
}

export class UpdateUserGroupDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsObject()
  @IsOptional()
  visibilityRules?: any;
}

export class UserGroupResponseDto {
  id: string;
  teamId: string;
  name: string;
  isPublic: boolean;
  createdBy: string;
  visibilityRules?: any;
  createdAt: Date;
  updatedAt: Date;
}
