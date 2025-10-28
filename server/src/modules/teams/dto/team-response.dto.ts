import { TeamVisibility } from '../enums/team-visibility.enum';
import { MembershipStatus } from '../enums/membership-status.enum';
import { IsString, IsArray, IsUUID, Matches, IsEnum, IsOptional } from 'class-validator';

export class TeamResponseDto {
  id: string;
  name: string;
  teamNumber: number;
  description?: string;
  roles: string[];
  roleConstraints?: string;
  visibility: TeamVisibility;
  memberCount?: number;
  pendingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TeamMemberDto {
  userId: string;
  teamId: string;
  roles: string[];
  status: MembershipStatus;
  subteams?: string[]; // Names of subteams this member belongs to
  leadPositions?: Array<{ subteamName: string; positionTitle: string }>; // Lead positions in subteams
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
