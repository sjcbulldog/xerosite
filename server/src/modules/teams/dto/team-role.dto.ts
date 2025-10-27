import { IsString, IsBoolean, IsArray, IsOptional, IsInt, Min } from 'class-validator';

export class CreateTeamRoleDto {
  @IsString()
  roleName: string;

  @IsBoolean()
  @IsOptional()
  isRemovable?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedGroups?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateTeamRoleDto {
  @IsString()
  @IsOptional()
  roleName?: string;

  @IsBoolean()
  @IsOptional()
  isRemovable?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedRoles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedGroups?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class TeamRoleResponseDto {
  id: number;
  roleName: string;
  isRemovable: boolean;
  excludedRoles: string[];
  excludedGroups: string[];
  sortOrder: number;
}
