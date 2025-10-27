import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { UserTeam } from './entities/user-team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamResponseDto, TeamMemberDto, AddTeamMemberDto, UpdateMemberStatusDto } from './dto/team-response.dto';
import { MembershipStatus } from './enums/membership-status.enum';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<TeamResponseDto> {
    const team = this.teamRepository.create({
      name: createTeamDto.name,
      teamNumber: createTeamDto.teamNumber,
      description: createTeamDto.description,
      roles: createTeamDto.roles ? createTeamDto.roles.join(',') : 'admin,Mentor,Student,Parent',
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

    // Validate roles
    const teamRoles = team.getRolesArray();
    const invalidRoles = roles.filter((role) => !teamRoles.includes(role));

    if (invalidRoles.length > 0) {
      throw new BadRequestException(`Invalid roles: ${invalidRoles.join(', ')}. Available roles: ${teamRoles.join(', ')}`);
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
}
