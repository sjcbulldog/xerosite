import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { UserTeam } from './entities/user-team.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { Subteam } from './entities/subteam.entity';
import { SubteamMember } from './entities/subteam-member.entity';
import { SubteamLeadPosition } from './entities/subteam-lead-position.entity';
import { UserPermission } from './entities/user-permission.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import {
  TeamResponseDto,
  TeamMemberDto,
  AddTeamMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberAttributesDto,
  UserPermissionDto,
} from './dto/team-response.dto';
import {
  SendInvitationDto,
  TeamInvitationResponseDto,
  UpdateInvitationStatusDto,
} from './dto/team-invitation.dto';
import { ImportRosterDto, ImportRosterResultDto, RosterMemberDto } from './dto/import-roster.dto';
import { MembershipStatus } from './enums/membership-status.enum';
import { TeamVisibility } from './enums/team-visibility.enum';
import { TeamPermission } from './enums/team-permission.enum';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { UserState } from '../users/enums/user-state.enum';
import { TeamLinksService } from '../team-links/team-links.service';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(TeamInvitation)
    private readonly invitationRepository: Repository<TeamInvitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Subteam)
    private readonly subteamRepository: Repository<Subteam>,
    @InjectRepository(SubteamMember)
    private readonly subteamMemberRepository: Repository<SubteamMember>,
    @InjectRepository(SubteamLeadPosition)
    private readonly subteamLeadPositionRepository: Repository<SubteamLeadPosition>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly teamLinksService: TeamLinksService,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    // Check if a team with this team number already exists
    const existingTeam = await this.teamRepository.findOne({
      where: { teamNumber: createTeamDto.teamNumber },
    });

    if (existingTeam) {
      throw new BadRequestException(
        `A team with number ${createTeamDto.teamNumber} already exists`,
      );
    }

    const team = this.teamRepository.create({
      name: createTeamDto.name,
      teamNumber: createTeamDto.teamNumber,
      description: createTeamDto.description,
      roles: createTeamDto.roles
        ? createTeamDto.roles.join(',')
        : 'Administrator,Mentor,Student,Parent',
      roleConstraints: createTeamDto.roleConstraints || null,
      visibility: createTeamDto.visibility,
      timezone: createTeamDto.timezone || 'America/New_York',
    });

    // Validate role names
    if (!team.validateRoles()) {
      throw new BadRequestException(
        'Invalid role names. Roles must contain only alphanumeric characters, spaces, dashes, and underscores.',
      );
    }

    const savedTeam = await this.teamRepository.save(team);

    // Create default Blue Alliance link
    await this.teamLinksService.createDefaultLink(savedTeam.id, savedTeam.teamNumber);

    return this.transformToResponse(savedTeam);
  }

  async findAll(): Promise<TeamResponseDto[]> {
    const teams = await this.teamRepository.find({
      relations: ['userTeams'],
    });
    return teams.map((team) => this.transformToResponse(team));
  }

  async findPublicTeamsForUser(userId: string): Promise<TeamResponseDto[]> {
    // Get all public teams
    const publicTeams = await this.teamRepository.find({
      where: { visibility: 'public' as any },
      relations: ['userTeams'],
    });

    // Filter out teams where user has disabled membership
    const teamsWithoutDisabled = [];
    for (const team of publicTeams) {
      const userMembership = await this.userTeamRepository.findOne({
        where: { userId, teamId: team.id },
      });

      // Only include if user has no membership or membership is not disabled
      if (!userMembership || userMembership.status !== MembershipStatus.DISABLED) {
        teamsWithoutDisabled.push(team);
      }
    }

    return teamsWithoutDisabled.map((team) => this.transformToResponse(team));
  }

  async findOne(id: string): Promise<TeamResponseDto> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['userTeams'],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return this.transformToResponse(team);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.teamRepository.findOne({ where: { id } });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    if (updateTeamDto.name) {
      team.name = updateTeamDto.name;
    }

    if (updateTeamDto.description !== undefined) {
      team.description = updateTeamDto.description;
    }

    if (updateTeamDto.roles) {
      team.setRolesArray(updateTeamDto.roles);
      if (!team.validateRoles()) {
        throw new BadRequestException(
          'Invalid role names. Roles must contain only alphanumeric characters, spaces, dashes, and underscores.',
        );
      }
    }

    if (updateTeamDto.roleConstraints !== undefined) {
      team.roleConstraints = updateTeamDto.roleConstraints || null;
    }

    if (updateTeamDto.visibility !== undefined) {
      team.visibility = updateTeamDto.visibility;
    }

    const updatedTeam = await this.teamRepository.save(team);
    return this.transformToResponse(updatedTeam);
  }

  async remove(id: string, userId: string): Promise<void> {
    const team = await this.teamRepository.findOne({ where: { id } });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Check if user is a site administrator
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.state !== UserState.ADMIN) {
      throw new BadRequestException('Only site administrators can delete teams');
    }

    // Get all team administrators before deleting the team
    const adminMembers = await this.userTeamRepository.find({
      where: { teamId: id, status: MembershipStatus.ACTIVE },
      relations: ['user', 'user.emails'],
    });

    // Filter to only administrators
    const administrators = adminMembers.filter((member) =>
      member.getRolesArray().includes('Administrator'),
    );

    // Send notification emails to all administrators
    await this.notifyAdministratorsOfTeamDeletion(team, administrators);

    // Delete the team (cascade will handle related records)
    await this.teamRepository.remove(team);
  }

  private async notifyAdministratorsOfTeamDeletion(
    team: Team,
    administrators: UserTeam[],
  ): Promise<void> {
    try {
      if (administrators.length === 0) {
        this.logger.warn(
          `No administrators found for team ${team.name} (${team.id}) to notify of deletion`,
        );
        return;
      }

      this.logger.log(
        `Notifying ${administrators.length} administrator(s) of team ${team.name} deletion`,
      );

      // Send email to each administrator
      for (const adminMember of administrators) {
        const adminEmail = adminMember.user?.primaryEmail || adminMember.user?.emails?.[0]?.email;

        if (!adminEmail) {
          this.logger.warn(
            `No email found for administrator ${adminMember.userId} of team ${team.name}`,
          );
          continue;
        }

        const adminName = adminMember.user
          ? `${adminMember.user.firstName} ${adminMember.user.lastName}`
          : 'Administrator';

        await this.emailService.sendEmail({
          to: adminEmail,
          subject: `Team Deleted: ${team.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
                <h2 style="color: #721c24; margin: 0 0 10px 0;">Team Deleted</h2>
                <p style="color: #721c24; margin: 0;">
                  Team: <strong>${team.name}</strong> (Team #${team.teamNumber})
                </p>
              </div>
              
              <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <p style="color: #333; line-height: 1.6;">
                  Hi ${adminName},
                </p>
                <p style="color: #333; line-height: 1.6;">
                  This is to inform you that <strong>${team.name}</strong> (Team #${team.teamNumber}) has been deleted from the system by a site administrator.
                </p>
                <p style="color: #333; line-height: 1.6;">
                  All team data, including members, subteams, calendar events, and other related information, has been permanently removed from the system.
                </p>
                <p style="color: #666; line-height: 1.6; margin-top: 15px;">
                  If you have any questions about this action, please contact a site administrator.
                </p>
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                <p style="color: #666; font-size: 0.9em; margin: 0;">
                  This is an automated notification from the team management system.
                </p>
              </div>
            </div>
          `,
        });
      }
    } catch (error) {
      // Log the error but don't fail the team deletion
      this.logger.error('Error notifying administrators of team deletion:', error);
    }
  }

  async addMember(teamId: string, addMemberDto: AddTeamMemberDto): Promise<TeamMemberDto> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Validate that all roles exist in the team's role list
    const teamRoles = team.getRolesArray();
    const invalidRoles = addMemberDto.roles.filter((role) => !teamRoles.includes(role));

    if (invalidRoles.length > 0) {
      throw new BadRequestException(
        `Invalid roles: ${invalidRoles.join(', ')}. Available roles: ${teamRoles.join(', ')}`,
      );
    }

    // Check if user is already a member
    const existingMember = await this.userTeamRepository.findOne({
      where: { userId: addMemberDto.userId, teamId },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this team');
    }

    const userTeam = this.userTeamRepository.create({
      userId: addMemberDto.userId,
      teamId,
      roles: addMemberDto.roles.join(','),
      status: addMemberDto.status || MembershipStatus.PENDING,
    });

    const savedUserTeam = await this.userTeamRepository.save(userTeam);
    return this.transformToMemberDto(savedUserTeam);
  }

  async getTeamMembers(teamId: string): Promise<TeamMemberDto[]> {
    const userTeams = await this.userTeamRepository.find({
      where: { teamId },
      relations: ['user', 'user.emails', 'user.phones'],
    });

    // Get all subteam memberships for this team
    const subteamMembers = await this.subteamMemberRepository
      .createQueryBuilder('sm')
      .leftJoin('sm.subteam', 'subteam')
      .where('subteam.teamId = :teamId', { teamId })
      .select(['sm.userId', 'subteam.name'])
      .getMany();

    // Create a map of userId to subteam names
    const userSubteamsMap = new Map<string, string[]>();
    for (const member of subteamMembers) {
      const subteamName = (member as any).subteam?.name;
      if (subteamName) {
        if (!userSubteamsMap.has(member.userId)) {
          userSubteamsMap.set(member.userId, []);
        }
        userSubteamsMap.get(member.userId)!.push(subteamName);
      }
    }

    // Get all lead positions for this team
    const leadPositions = await this.subteamLeadPositionRepository
      .createQueryBuilder('slp')
      .leftJoin('slp.subteam', 'subteam')
      .where('subteam.teamId = :teamId', { teamId })
      .andWhere('slp.userId IS NOT NULL')
      .select(['slp.userId', 'slp.title', 'subteam.name'])
      .getMany();

    // Create a map of userId to lead positions
    const userLeadPositionsMap = new Map<
      string,
      Array<{ subteamName: string; positionTitle: string }>
    >();
    for (const position of leadPositions) {
      if (position.userId) {
        const subteamName = (position as any).subteam?.name;
        const positionTitle = position.title;
        if (subteamName && positionTitle) {
          if (!userLeadPositionsMap.has(position.userId)) {
            userLeadPositionsMap.set(position.userId, []);
          }
          userLeadPositionsMap.get(position.userId)!.push({
            subteamName,
            positionTitle,
          });
        }
      }
    }

    // Get all permissions for this team
    const allPermissions = await this.userPermissionRepository.find({
      where: { teamId },
    });

    // Create a map of userId to permissions
    const userPermissionsMap = new Map<string, UserPermissionDto[]>();
    for (const perm of allPermissions) {
      if (!userPermissionsMap.has(perm.userId)) {
        userPermissionsMap.set(perm.userId, []);
      }
      userPermissionsMap.get(perm.userId)!.push({
        permission: perm.permission,
        enabled: perm.enabled,
      });
    }

    return userTeams.map((userTeam) =>
      this.transformToMemberDto(
        userTeam,
        userSubteamsMap.get(userTeam.userId),
        userLeadPositionsMap.get(userTeam.userId),
        userPermissionsMap.get(userTeam.userId),
      ),
    );
  }

  async updateMemberRoles(teamId: string, userId: string, roles: string[]): Promise<TeamMemberDto> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
      relations: ['user', 'user.emails', 'user.phones'],
    });

    if (!userTeam) {
      throw new NotFoundException(`User is not a member of this team`);
    }

    // Validate roles exist in team
    const teamRoles = team.getRolesArray();
    const invalidRoles = roles.filter((role) => !teamRoles.includes(role));

    if (invalidRoles.length > 0) {
      throw new BadRequestException(
        `Invalid roles: ${invalidRoles.join(', ')}. Available roles: ${teamRoles.join(', ')}`,
      );
    }

    // Validate role constraints - check if any assigned roles are mutually exclusive
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        if (team.areRolesConstrained(roles[i], roles[j])) {
          throw new BadRequestException(
            `Cannot assign both "${roles[i]}" and "${roles[j]}" roles. They are mutually exclusive.`,
          );
        }
      }
    }

    // Check if removing Administrator role from the last admin
    const currentRoles = userTeam.getRolesArray();
    const isRemovingAdmin =
      currentRoles.includes('Administrator') && !roles.includes('Administrator');

    if (isRemovingAdmin) {
      // Count how many active members have the Administrator role
      const allMembers = await this.userTeamRepository.find({
        where: { teamId, status: MembershipStatus.ACTIVE },
      });

      const adminCount = allMembers.filter((member) =>
        member.getRolesArray().includes('Administrator'),
      ).length;

      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove Administrator role. At least one team member must have the Administrator role.',
        );
      }
    }

    userTeam.setRolesArray(roles);
    const updatedUserTeam = await this.userTeamRepository.save(userTeam);
    return this.transformToMemberDto(updatedUserTeam);
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    const result = await this.userTeamRepository.delete({ userId, teamId });

    if (result.affected === 0) {
      throw new NotFoundException('User is not a member of this team');
    }
  }

  async updateMemberStatus(
    teamId: string,
    userId: string,
    updateStatusDto: UpdateMemberStatusDto,
  ): Promise<TeamMemberDto> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
      relations: ['user', 'user.emails', 'user.phones'],
    });

    if (!userTeam) {
      throw new NotFoundException('User is not a member of this team');
    }

    const previousStatus = userTeam.status;
    userTeam.status = updateStatusDto.status;
    const updatedUserTeam = await this.userTeamRepository.save(userTeam);

    // Send notification email if status changed from pending to active or disabled
    if (previousStatus === MembershipStatus.PENDING) {
      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (team && userTeam.user) {
        if (updateStatusDto.status === MembershipStatus.ACTIVE) {
          await this.notifyUserOfApproval(team, userTeam.user);
        } else if (updateStatusDto.status === MembershipStatus.DISABLED) {
          await this.notifyUserOfRejection(team, userTeam.user);
        }
      }
    }

    return this.transformToMemberDto(updatedUserTeam);
  }

  async requestToJoin(teamId: string, userId: string): Promise<TeamMemberDto> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if user is already a member
    const existingMember = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (existingMember) {
      throw new BadRequestException(
        'You have already requested to join this team or are already a member',
      );
    }

    // Get the user who is requesting to join
    const requestingUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['emails'],
    });

    if (!requestingUser) {
      throw new NotFoundException('User not found');
    }

    // Create pending membership with default Student role
    const teamRoles = team.getRolesArray();
    const defaultRole = teamRoles.includes('Student') ? 'Student' : teamRoles[0];

    const userTeam = this.userTeamRepository.create({
      userId,
      teamId,
      roles: defaultRole,
      status: MembershipStatus.PENDING,
    });

    const savedUserTeam = await this.userTeamRepository.save(userTeam);

    // Send notification emails to all administrators
    await this.notifyAdministratorsOfJoinRequest(team, requestingUser);

    return this.transformToMemberDto(savedUserTeam);
  }

  private async notifyAdministratorsOfJoinRequest(team: Team, requestingUser: User): Promise<void> {
    try {
      // Get all team members with Administrator role
      const adminMembers = await this.userTeamRepository.find({
        where: { teamId: team.id, status: MembershipStatus.ACTIVE },
        relations: ['user', 'user.emails'],
      });

      // Filter to only administrators
      const administrators = adminMembers.filter((member) =>
        member.getRolesArray().includes('Administrator'),
      );

      if (administrators.length === 0) {
        console.warn(`No administrators found for team ${team.name} (${team.id})`);
        return;
      }

      const requestingUserEmail =
        requestingUser.primaryEmail || requestingUser.emails?.[0]?.email || 'Unknown';
      const requestingUserName = `${requestingUser.firstName} ${requestingUser.lastName}`;

      // Send email to each administrator
      for (const adminMember of administrators) {
        const adminEmail = adminMember.user?.primaryEmail || adminMember.user?.emails?.[0]?.email;

        if (adminEmail) {
          await this.emailService.sendEmail({
            to: adminEmail,
            subject: `New Join Request for Team: ${team.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #333; margin: 0 0 10px 0;">New Team Join Request</h2>
                  <p style="color: #666; margin: 0;">
                    Team: <strong>${team.name}</strong> (Team #${team.teamNumber})
                  </p>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                  <h3 style="color: #333; margin: 0 0 15px 0;">Request Details</h3>
                  <p style="color: #333; line-height: 1.6;">
                    <strong>${requestingUserName}</strong> (${requestingUserEmail}) has requested to join your team.
                  </p>
                  <p style="color: #666; line-height: 1.6; margin-top: 15px;">
                    Please log in to your dashboard to review and approve or decline this request.
                  </p>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                  <p style="color: #666; font-size: 0.9em; margin: 0;">
                    This is an automated notification from the team management system.
                  </p>
                </div>
              </div>
            `,
          });
        }
      }
    } catch (error) {
      // Log the error but don't fail the join request
      console.error('Error notifying administrators of join request:', error);
    }
  }

  private async notifyUserOfApproval(team: Team, user: User): Promise<void> {
    try {
      const userEmail = user.primaryEmail || user.emails?.[0]?.email;

      if (!userEmail) {
        console.warn(`No email found for user ${user.id} to notify of approval`);
        return;
      }

      const userName = `${user.firstName} ${user.lastName}`;

      await this.emailService.sendEmail({
        to: userEmail,
        subject: `Your Request to Join ${team.name} Has Been Approved`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
              <h2 style="color: #155724; margin: 0 0 10px 0;">✓ Request Approved</h2>
              <p style="color: #155724; margin: 0;">
                Team: <strong>${team.name}</strong> (Team #${team.teamNumber})
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <p style="color: #333; line-height: 1.6;">
                Hi ${userName},
              </p>
              <p style="color: #333; line-height: 1.6;">
                Good news! Your request to join <strong>${team.name}</strong> has been approved by a team administrator.
              </p>
              <p style="color: #333; line-height: 1.6;">
                You can now access the team dashboard, view team information, and participate in team activities.
              </p>
              <p style="color: #666; line-height: 1.6; margin-top: 15px;">
                Log in to your dashboard to get started!
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
              <p style="color: #666; font-size: 0.9em; margin: 0;">
                This is an automated notification from the team management system.
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error notifying user of approval:', error);
    }
  }

  private async notifyUserOfRejection(team: Team, user: User): Promise<void> {
    try {
      const userEmail = user.primaryEmail || user.emails?.[0]?.email;

      if (!userEmail) {
        console.warn(`No email found for user ${user.id} to notify of rejection`);
        return;
      }

      const userName = `${user.firstName} ${user.lastName}`;

      await this.emailService.sendEmail({
        to: userEmail,
        subject: `Update on Your Request to Join ${team.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
              <h2 style="color: #856404; margin: 0 0 10px 0;">Request Update</h2>
              <p style="color: #856404; margin: 0;">
                Team: <strong>${team.name}</strong> (Team #${team.teamNumber})
              </p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <p style="color: #333; line-height: 1.6;">
                Hi ${userName},
              </p>
              <p style="color: #333; line-height: 1.6;">
                Thank you for your interest in joining <strong>${team.name}</strong>.
              </p>
              <p style="color: #333; line-height: 1.6;">
                Unfortunately, your request to join the team has not been approved at this time.
              </p>
              <p style="color: #666; line-height: 1.6; margin-top: 15px;">
                If you have questions about this decision, please contact a team administrator directly.
              </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
              <p style="color: #666; font-size: 0.9em; margin: 0;">
                This is an automated notification from the team management system.
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error notifying user of rejection:', error);
    }
  }

  private transformToResponse(team: Team): TeamResponseDto {
    const activeMemberCount =
      team.userTeams?.filter((ut) => ut.status === MembershipStatus.ACTIVE).length || 0;
    const pendingMemberCount =
      team.userTeams?.filter((ut) => ut.status === MembershipStatus.PENDING).length || 0;

    return {
      id: team.id,
      name: team.name,
      teamNumber: team.teamNumber,
      description: team.description,
      roles: team.getRolesArray(),
      roleConstraints: team.roleConstraints,
      visibility: team.visibility,
      timezone: team.timezone,
      memberCount: activeMemberCount,
      pendingCount: pendingMemberCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private transformToMemberDto(
    userTeam: UserTeam,
    subteams?: string[],
    leadPositions?: Array<{ subteamName: string; positionTitle: string }>,
    permissions?: UserPermissionDto[],
  ): TeamMemberDto {
    const primaryPhone = userTeam.user?.phones?.find((phone) => phone.isPrimary);

    return {
      userId: userTeam.userId,
      teamId: userTeam.teamId,
      roles: userTeam.getRolesArray(),
      status: userTeam.status,
      subteams: subteams && subteams.length > 0 ? subteams : undefined,
      leadPositions: leadPositions && leadPositions.length > 0 ? leadPositions : undefined,
      permissions: permissions && permissions.length > 0 ? permissions : undefined,
      user: userTeam.user
        ? {
            id: userTeam.user.id,
            firstName: userTeam.user.firstName,
            lastName: userTeam.user.lastName,
            fullName: userTeam.user.fullName,
            primaryEmail: userTeam.user.primaryEmail,
            primaryPhone: primaryPhone?.phoneNumber,
            isActive: userTeam.user.isActive,
          }
        : undefined,
      createdAt: userTeam.createdAt,
      updatedAt: userTeam.updatedAt,
    };
  }

  // Role Management Methods - simplified to use team.roles field only
  async getTeamRoles(teamId: string): Promise<string[]> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team.getRolesArray();
  }

  // Invitation Management Methods
  async sendInvitation(
    teamId: string,
    sendInvitationDto: SendInvitationDto,
    invitedBy: string,
  ): Promise<TeamInvitationResponseDto> {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if invitation already exists for this email and team
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        teamId,
        email: sendInvitationDto.email,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('An invitation to this email is already pending');
    }

    // Create invitation
    const invitation = this.invitationRepository.create({
      teamId,
      email: sendInvitationDto.email,
      invitedBy,
      status: 'pending',
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Send email
    try {
      await this.emailService.sendTeamInvitationEmail(
        sendInvitationDto.email,
        team.name,
        team.teamNumber,
      );
    } catch (error) {
      // Log email error but don't fail the invitation creation
      console.error('Failed to send invitation email:', error);
    }

    return this.transformToInvitationDto(savedInvitation, team.name);
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitationResponseDto[]> {
    const invitations = await this.invitationRepository.find({
      where: { teamId },
      relations: ['team'],
    });

    return invitations.map((inv) => this.transformToInvitationDto(inv, inv.team.name));
  }

  async getUserInvitations(email: string): Promise<TeamInvitationResponseDto[]> {
    const invitations = await this.invitationRepository.find({
      where: { email, status: 'pending' },
      relations: ['team'],
    });

    return invitations.map((inv) => this.transformToInvitationDto(inv, inv.team.name));
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<TeamMemberDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['team'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('This invitation has already been processed');
    }

    // Check if user is already a member
    const existingMember = await this.userTeamRepository.findOne({
      where: { userId, teamId: invitation.teamId },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this team');
    }

    // Create active membership with default Student role
    // Since the user was invited by a team admin, they should be immediately active
    const teamRoles = invitation.team.getRolesArray();
    const defaultRole = teamRoles.includes('Student') ? 'Student' : teamRoles[0];

    const userTeam = this.userTeamRepository.create({
      userId,
      teamId: invitation.teamId,
      roles: defaultRole,
      status: MembershipStatus.ACTIVE,
    });

    const savedUserTeam = await this.userTeamRepository.save(userTeam);

    // Update invitation status
    invitation.status = 'accepted';
    await this.invitationRepository.save(invitation);

    return this.transformToMemberDto(savedUserTeam);
  }

  async declineInvitation(invitationId: string): Promise<TeamInvitationResponseDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['team'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('This invitation has already been processed');
    }

    invitation.status = 'declined';
    const updatedInvitation = await this.invitationRepository.save(invitation);

    return this.transformToInvitationDto(updatedInvitation, invitation.team.name);
  }

  private transformToInvitationDto(
    invitation: TeamInvitation,
    teamName?: string,
  ): TeamInvitationResponseDto {
    return {
      id: invitation.id,
      teamId: invitation.teamId,
      email: invitation.email,
      invitedBy: invitation.invitedBy,
      status: invitation.status,
      teamName,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  async getRoleConstraints(teamId: string): Promise<Array<[string, string]>> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team.getRoleConstraintsArray();
  }

  async updateRoleConstraints(
    teamId: string,
    constraints: Array<[string, string]>,
  ): Promise<Array<[string, string]>> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Validate that all constraint roles exist in team roles
    const teamRoles = team.getRolesArray();
    for (const [role1, role2] of constraints) {
      if (!teamRoles.includes(role1)) {
        throw new BadRequestException(`Role "${role1}" does not exist in team roles`);
      }
      if (!teamRoles.includes(role2)) {
        throw new BadRequestException(`Role "${role2}" does not exist in team roles`);
      }
      if (role1 === role2) {
        throw new BadRequestException(`Cannot create constraint with same role: "${role1}"`);
      }
    }

    team.setRoleConstraintsArray(constraints);
    await this.teamRepository.save(team);

    return team.getRoleConstraintsArray();
  }

  async importRoster(teamId: string, importData: ImportRosterDto): Promise<ImportRosterResultDto> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const result: ImportRosterResultDto = {
      successful: 0,
      failed: 0,
      errors: [],
      created: [],
      existing: [],
    };

    const defaultRoles: string[] = []; // No default roles for imported members

    for (let i = 0; i < importData.members.length; i++) {
      const member = importData.members[i];
      const rowNumber = i + 2; // +2 because row 1 is headers and arrays are 0-indexed

      try {
        // Validate required fields
        if (!member.email || !member.email.trim()) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: member.email,
            error: 'Email is required',
          });
          continue;
        }

        if (!member.first || !member.first.trim()) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: member.email,
            error: 'First name is required',
          });
          continue;
        }

        if (!member.last || !member.last.trim()) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: member.email,
            error: 'Last name is required',
          });
          continue;
        }

        // Handle multiple email addresses separated by semicolons
        const emailAddresses = member.email
          .split(';')
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0);

        if (emailAddresses.length === 0) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            email: member.email,
            error: 'No valid email addresses found',
          });
          continue;
        }

        const primaryEmail = emailAddresses[0];
        const firstName = member.first.trim();
        const lastName = member.last.trim();

        // Check if user already exists (using primary email)
        let user = await this.usersService.findByEmail(primaryEmail);
        let isNewUser = false;

        if (!user) {
          // Create new user with default password or a temporary one
          const password = importData.defaultPassword || Math.random().toString(36).slice(-12);

          // Handle multiple phone numbers separated by semicolons
          let phones: any[] | undefined = undefined;
          if (member.phoneNumber?.trim()) {
            const phoneNumbers = member.phoneNumber
              .split(';')
              .map((p) => p.trim())
              .filter((p) => p.length > 0);

            phones = phoneNumbers.map((phoneNumber, index) => ({
              phoneNumber: phoneNumber,
              phoneType: 'mobile',
              isPrimary: index === 0, // First phone is primary
            }));
          }

          // Build emails array from semicolon-separated list
          const emails = emailAddresses.map((email, index) => ({
            email: email,
            emailType: index === 0 ? 'personal' : 'work',
            isPrimary: index === 0, // First email is primary
          }));

          const registerDto: any = {
            firstName,
            lastName,
            password: password,
            emails: emails,
            phones: phones,
            addresses:
              member.address?.trim() &&
              member.city?.trim() &&
              member.state?.trim() &&
              member.zip?.trim()
                ? [
                    {
                      streetLine1: member.address.trim(),
                      city: member.city.trim(),
                      stateProvince: member.state.trim(),
                      postalCode: member.zip.trim(),
                      country: 'USA',
                      addressType: 'home',
                      isPrimary: true,
                    },
                  ]
                : undefined,
            // Set user state and isActive based on defaultStatus
            state:
              importData.defaultStatus === MembershipStatus.ACTIVE
                ? UserState.ACTIVE
                : UserState.PENDING,
            isActive: importData.defaultStatus === MembershipStatus.ACTIVE,
          };

          user = await this.usersService.register(registerDto);
          isNewUser = true;

          result.created.push({
            email: primaryEmail,
            name: `${firstName} ${lastName}`,
          });

          // TODO: Send verification email for new user
          // This would require access to AuthService or EmailService
          // For now, the user will be in pending state
        } else {
          result.existing.push({
            email: primaryEmail,
            name: user.fullName,
          });
        }

        // Check if user is already a member of this team
        const existingMembership = await this.userTeamRepository.findOne({
          where: { userId: user.id, teamId },
        });

        if (existingMembership) {
          // Skip if already a member
          result.successful++;
          continue;
        }

        // Directly add all users to the team with active membership status
        // The user's isActive field (set during user creation) determines if they can log in
        const userTeam = this.userTeamRepository.create({
          userId: user.id,
          teamId,
          roles: defaultRoles.join(','),
          status: MembershipStatus.ACTIVE, // Team membership is always active
        });

        await this.userTeamRepository.save(userTeam);

        // Send notification email to primary email address (if sendEmails is not explicitly false)
        if (importData.sendEmails !== false) {
          await this.emailService.sendTeamInvitationEmail(primaryEmail, team.name, team.teamNumber);
        }

        result.successful++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: member.email,
          error: error.message || 'Failed to process member',
        });
      }
    }

    return result;
  }

  async getSiteStatistics(): Promise<{
    publicTeamsCount: number;
    privateTeamsCount: number;
    totalUsersCount: number;
  }> {
    // Count public teams
    const publicTeamsCount = await this.teamRepository.count({
      where: { visibility: TeamVisibility.PUBLIC },
    });

    // Count private teams
    const privateTeamsCount = await this.teamRepository.count({
      where: { visibility: TeamVisibility.PRIVATE },
    });

    // Count total users
    const totalUsersCount = await this.userRepository.count();

    return {
      publicTeamsCount,
      privateTeamsCount,
      totalUsersCount,
    };
  }

  // Permission Management Methods
  async updateMemberAttributes(
    teamId: string,
    userId: string,
    adminUserId: string,
    updateDto: UpdateMemberAttributesDto,
  ): Promise<TeamMemberDto> {
    // Verify admin permissions
    await this.verifyTeamAdmin(teamId, adminUserId);

    // Get the user team relationship
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
      relations: ['user', 'user.phones'],
    });

    if (!userTeam) {
      throw new NotFoundException('User is not a member of this team');
    }

    // Update roles if provided
    if (updateDto.roles !== undefined) {
      userTeam.setRolesArray(updateDto.roles);
      await this.userTeamRepository.save(userTeam);
    }

    // Update user active status if provided
    if (updateDto.isActive !== undefined) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        user.isActive = updateDto.isActive;
        await this.userRepository.save(user);
      }
    }

    // Update permissions if provided
    if (updateDto.permissions !== undefined) {
      // Delete existing permissions for this user/team
      await this.userPermissionRepository.delete({ userId, teamId });

      // Create new permissions
      const permissionsToSave = updateDto.permissions.map((perm) =>
        this.userPermissionRepository.create({
          userId,
          teamId,
          permission: perm.permission,
          enabled: perm.enabled,
        }),
      );

      if (permissionsToSave.length > 0) {
        await this.userPermissionRepository.save(permissionsToSave);
      }
    }

    // Reload and return updated member
    const updatedUserTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
      relations: ['user', 'user.phones'],
    });

    // Get permissions for this user/team
    const permissions = await this.getUserPermissions(userId, teamId);

    return this.transformToMemberDto(updatedUserTeam, undefined, undefined, permissions);
  }

  async getUserPermissions(userId: string, teamId: string): Promise<UserPermissionDto[]> {
    // Check if user is team administrator - admins automatically have all permissions
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (userTeam && userTeam.getRolesArray().includes('Administrator')) {
      // Return all permissions as enabled for administrators
      return Object.values(TeamPermission).map((permission) => ({
        permission,
        enabled: true,
      }));
    }

    // For non-admins, return permissions from database
    const permissions = await this.userPermissionRepository.find({
      where: { userId, teamId },
    });

    return permissions.map((p) => ({
      permission: p.permission,
      enabled: p.enabled,
    }));
  }

  async hasPermission(
    userId: string,
    teamId: string,
    permission: TeamPermission,
  ): Promise<boolean> {
    // Check if user is team administrator - admins automatically have all permissions
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (userTeam && userTeam.getRolesArray().includes('Administrator')) {
      return true;
    }

    // Check for explicit permission in database
    const userPermission = await this.userPermissionRepository.findOne({
      where: { userId, teamId, permission },
    });

    return userPermission?.enabled ?? false;
  }

  private async verifyTeamAdmin(teamId: string, userId: string): Promise<void> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam || !userTeam.getRolesArray().includes('Administrator')) {
      throw new BadRequestException('User must be a team administrator');
    }
  }

  async exportUsersToCSV(
    teamId: string,
    userId: string,
    fields?: string[],
    includeSubteams = false,
  ): Promise<string> {
    // Verify user is team administrator
    await this.verifyTeamAdmin(teamId, userId);

    // Get all active team members with user and subteam relations
    const members = await this.userTeamRepository.find({
      where: { teamId, status: MembershipStatus.ACTIVE },
      relations: ['user', 'user.emails', 'user.phones', 'user.addresses'],
    });

    // Define available fields
    const availableFields = {
      firstName: 'First Name',
      middleName: 'Middle Name',
      lastName: 'Last Name',
      fullName: 'Full Name',
      primaryEmail: 'Primary Email',
      primaryPhone: 'Primary Phone',
      roles: 'Roles',
      state: 'State',
      createdAt: 'Member Since',
    };

    // Default fields if none specified
    const selectedFields =
      fields && fields.length > 0 ? fields : ['firstName', 'lastName', 'primaryEmail', 'roles'];

    // Build CSV header
    const headers = selectedFields.map((field) => availableFields[field] || field);
    if (includeSubteams) {
      headers.push('Subteams');
    }

    // Get subteam memberships if needed
    const subteamMemberships: Map<string, string[]> = new Map();
    if (includeSubteams) {
      const subteamMembers = await this.subteamMemberRepository.find({
        relations: ['subteam'],
      });

      // Build map of userId to subteam names
      for (const member of subteamMembers) {
        if (member.subteam.teamId === teamId) {
          const existing = subteamMemberships.get(member.userId) || [];
          existing.push(member.subteam.name);
          subteamMemberships.set(member.userId, existing);
        }
      }
    }

    // Build CSV rows
    const rows: string[][] = [headers];

    for (const member of members) {
      const row: string[] = [];
      const user = member.user;

      for (const field of selectedFields) {
        let value = '';

        switch (field) {
          case 'firstName':
            value = user.firstName || '';
            break;
          case 'middleName':
            value = user.middleName || '';
            break;
          case 'lastName':
            value = user.lastName || '';
            break;
          case 'fullName':
            value = user.fullName || '';
            break;
          case 'primaryEmail':
            value = user.primaryEmail || '';
            break;
          case 'primaryPhone':
            value = user.primaryPhone || '';
            break;
          case 'roles':
            value = member.getRolesArray().join(', ');
            break;
          case 'state':
            value = user.state || '';
            break;
          case 'createdAt':
            value = member.createdAt.toISOString().split('T')[0];
            break;
          default:
            value = '';
        }

        // Escape CSV value
        row.push(this.escapeCSV(value));
      }

      // Add subteams if requested
      if (includeSubteams) {
        const subteams = subteamMemberships.get(user.id) || [];
        row.push(this.escapeCSV(subteams.join(', ')));
      }

      rows.push(row);
    }

    // Convert to CSV string
    return rows.map((row) => row.join(',')).join('\n');
  }

  private escapeCSV(value: string): string {
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  async exportTeam(teamId: string, userId: string): Promise<any> {
    // Verify user is team administrator
    const userTeam = await this.userTeamRepository.findOne({
      where: { teamId, userId },
    });

    if (!userTeam || !userTeam.hasRole('Administrator')) {
      throw new BadRequestException('Only team administrators can export team data');
    }

    // Get team with all basic information
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get all team members with full user details
    const teamMembers = await this.userTeamRepository.find({
      where: { teamId },
      relations: ['user', 'user.emails', 'user.phones', 'user.addresses'],
    });

    // Get all subteams with their lead positions and members
    const subteams = await this.subteamRepository.find({
      where: { teamId },
      relations: ['leadPositions', 'members'],
    });

    // Get user permissions for all team members
    const userPermissions = await this.userPermissionRepository.find({
      where: { teamId },
    });

    // Build the comprehensive export data
    const exportData = {
      exportDate: new Date().toISOString(),
      team: {
        id: team.id,
        name: team.name,
        teamNumber: team.teamNumber,
        description: team.description,
        visibility: team.visibility,
        timezone: team.timezone,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        roles: team.getRolesArray(),
        roleConstraints: team.getRoleConstraintsArray().map(([role1, role2]) => ({
          role1,
          role2,
        })),
      },
      subteams: subteams.map((subteam) => ({
        id: subteam.id,
        name: subteam.name,
        description: subteam.description,
        validRoles: subteam.validRoles ? subteam.validRoles.split(',').map((r) => r.trim()) : [],
        createdBy: subteam.createdBy,
        createdAt: subteam.createdAt,
        leadPositions: subteam.leadPositions.map((position) => ({
          id: position.id,
          title: position.title,
          requiredRole: position.requiredRole,
          userId: position.userId,
        })),
        memberUserIds: subteam.members.map((member) => member.userId),
      })),
      users: await Promise.all(
        teamMembers.map(async (member) => {
          const user = member.user;
          
          // Get subteams this user is a member of
          const userSubteams = await this.subteamMemberRepository.find({
            where: { userId: user.id },
            relations: ['subteam'],
          });

          // Get lead positions this user holds
          const leadPositions = await this.subteamLeadPositionRepository.find({
            where: { userId: user.id },
            relations: ['subteam'],
          });

          // Get user permissions
          const permissions = userPermissions
            .filter((p) => p.userId === user.id)
            .map((p) => ({
              permission: p.permission,
              enabled: p.enabled,
            }));

          return {
            id: user.id,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            state: user.state,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            emails: user.emails.map((email) => ({
              email: email.email,
              isPrimary: email.isPrimary,
              isVerified: email.isVerified,
            })),
            phones: user.phones.map((phone) => ({
              phoneNumber: phone.phoneNumber,
              isPrimary: phone.isPrimary,
            })),
            addresses: user.addresses.map((address) => ({
              addressType: address.addressType,
              streetLine1: address.streetLine1,
              streetLine2: address.streetLine2,
              city: address.city,
              stateProvince: address.stateProvince,
              postalCode: address.postalCode,
              country: address.country,
              isPrimary: address.isPrimary,
            })),
            teamMembership: {
              roles: member.getRolesArray(),
              status: member.status,
              joinedAt: member.createdAt,
            },
            subteams: userSubteams
              .filter((us) => us.subteam.teamId === teamId)
              .map((us) => ({
                subteamId: us.subteam.id,
                subteamName: us.subteam.name,
              })),
            leadPositions: leadPositions
              .filter((lp) => lp.subteam.teamId === teamId)
              .map((lp) => ({
                subteamId: lp.subteam.id,
                subteamName: lp.subteam.name,
                positionTitle: lp.title,
              })),
            permissions,
          };
        }),
      ),
    };

    return exportData;
  }
}
