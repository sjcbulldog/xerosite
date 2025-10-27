import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { UserTeam } from './entities/user-team.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto, TeamMemberDto, AddTeamMemberDto, UpdateMemberStatusDto } from './dto/team-response.dto';
import { SendInvitationDto, TeamInvitationResponseDto, UpdateInvitationStatusDto } from './dto/team-invitation.dto';
import { MembershipStatus } from './enums/membership-status.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(TeamInvitation)
    private readonly invitationRepository: Repository<TeamInvitation>,
    private readonly emailService: EmailService,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    // Check if a team with this team number already exists
    const existingTeam = await this.teamRepository.findOne({
      where: { teamNumber: createTeamDto.teamNumber },
    });

    if (existingTeam) {
      throw new BadRequestException(`A team with number ${createTeamDto.teamNumber} already exists`);
    }

    const team = this.teamRepository.create({
      name: createTeamDto.name,
      teamNumber: createTeamDto.teamNumber,
      description: createTeamDto.description,
      roles: createTeamDto.roles ? createTeamDto.roles.join(',') : 'Administrator,Mentor,Student,Parent',
      roleConstraints: createTeamDto.roleConstraints || null,
      visibility: createTeamDto.visibility,
    });

    // Validate role names
    if (!team.validateRoles()) {
      throw new BadRequestException('Invalid role names. Roles must contain only alphanumeric characters, spaces, dashes, and underscores.');
    }

    const savedTeam = await this.teamRepository.save(team);
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
        throw new BadRequestException('Invalid role names. Roles must contain only alphanumeric characters, spaces, dashes, and underscores.');
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

  async remove(id: string): Promise<void> {
    const result = await this.teamRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Team with ID ${id} not found`);
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
      throw new BadRequestException(`Invalid roles: ${invalidRoles.join(', ')}. Available roles: ${teamRoles.join(', ')}`);
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

    return userTeams.map((userTeam) => this.transformToMemberDto(userTeam));
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
      throw new BadRequestException(`Invalid roles: ${invalidRoles.join(', ')}. Available roles: ${teamRoles.join(', ')}`);
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

  async updateMemberStatus(teamId: string, userId: string, updateStatusDto: UpdateMemberStatusDto): Promise<TeamMemberDto> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
      relations: ['user', 'user.emails', 'user.phones'],
    });

    if (!userTeam) {
      throw new NotFoundException('User is not a member of this team');
    }

    userTeam.status = updateStatusDto.status;
    const updatedUserTeam = await this.userTeamRepository.save(userTeam);
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
      throw new BadRequestException('You have already requested to join this team or are already a member');
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
    return this.transformToMemberDto(savedUserTeam);
  }

  private transformToResponse(team: Team): TeamResponseDto {
    const activeMemberCount = team.userTeams?.filter(ut => ut.status === MembershipStatus.ACTIVE).length || 0;
    const pendingMemberCount = team.userTeams?.filter(ut => ut.status === MembershipStatus.PENDING).length || 0;
    
    return {
      id: team.id,
      name: team.name,
      teamNumber: team.teamNumber,
      description: team.description,
      roles: team.getRolesArray(),
      roleConstraints: team.roleConstraints,
      visibility: team.visibility,
      memberCount: activeMemberCount,
      pendingCount: pendingMemberCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private transformToMemberDto(userTeam: UserTeam): TeamMemberDto {
    const primaryPhone = userTeam.user?.phones?.find(phone => phone.isPrimary);
    
    return {
      userId: userTeam.userId,
      teamId: userTeam.teamId,
      roles: userTeam.getRolesArray(),
      status: userTeam.status,
      user: userTeam.user ? {
        id: userTeam.user.id,
        firstName: userTeam.user.firstName,
        lastName: userTeam.user.lastName,
        fullName: userTeam.user.fullName,
        primaryEmail: userTeam.user.primaryEmail,
        primaryPhone: primaryPhone?.phoneNumber,
        isActive: userTeam.user.isActive,
      } : undefined,
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

    // Create pending membership with default Student role
    const teamRoles = invitation.team.getRolesArray();
    const defaultRole = teamRoles.includes('Student') ? 'Student' : teamRoles[0];

    const userTeam = this.userTeamRepository.create({
      userId,
      teamId: invitation.teamId,
      roles: defaultRole,
      status: MembershipStatus.PENDING,
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

  private transformToInvitationDto(invitation: TeamInvitation, teamName?: string): TeamInvitationResponseDto {
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
}

