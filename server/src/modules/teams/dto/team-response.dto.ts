import { TeamVisibility } from '../enums/team-visibility.enum';
import { MembershipStatus } from '../enums/membership-status.enum';
import { TeamPermission } from '../enums/team-permission.enum';
import { IsString, IsArray, IsUUID, Matches, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export class TeamResponseDto {
  id: string;
  name: string;
  teamNumber: number;
  description?: string;
  roles: string[];
  roleConstraints?: string;
  visibility: TeamVisibility;
  timezone?: string;
  memberCount?: number;
  pendingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserPermissionDto {
  permission: TeamPermission;
  enabled: boolean;
}

export class TeamMemberDto {
  userId: string;
  teamId: string;
  roles: string[];
  status: MembershipStatus;
  subteams?: string[]; // Names of subteams this member belongs to
  leadPositions?: Array<{ subteamName: string; positionTitle: string }>; // Lead positions in subteams
  permissions?: UserPermissionDto[]; // User permissions for this team
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    primaryEmail?: string;
    primaryPhone?: string;
    isActive: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class AddTeamMemberDto {
  @IsUUID()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    each: true,
    message: 'Role names must contain only alphanumeric characters, spaces, dashes, and underscores',
  })
  roles: string[];

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}

export class UpdateTeamMemberRolesDto {
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    each: true,
    message: 'Role names must contain only alphanumeric characters, spaces, dashes, and underscores',
  })
  roles: string[];
}

export class UpdateMemberStatusDto {
  @IsEnum(MembershipStatus)
  status: MembershipStatus;
}

export class UpdateMemberAttributesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    each: true,
    message: 'Role names must contain only alphanumeric characters, spaces, dashes, and underscores',
  })
  roles?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  permissions?: Array<{
    permission: TeamPermission;
    enabled: boolean;
  }>;
}
