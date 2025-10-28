import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Subteam } from './entities/subteam.entity';
import { SubteamMember } from './entities/subteam-member.entity';
import { SubteamLeadPosition } from './entities/subteam-lead-position.entity';
import { UserTeam } from './entities/user-team.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateSubteamDto,
  UpdateSubteamDto,
  AddSubteamMembersDto,
  RemoveSubteamMemberDto,
  UpdateLeadPositionDto,
  SubteamResponseDto,
  SubteamMemberDto,
  SubteamLeadPositionDto,
} from './dto/subteam.dto';

@Injectable()
export class SubteamsService {
  constructor(
    @InjectRepository(Subteam)
    private readonly subteamRepository: Repository<Subteam>,
    @InjectRepository(SubteamMember)
    private readonly subteamMemberRepository: Repository<SubteamMember>,
    @InjectRepository(SubteamLeadPosition)
    private readonly subteamLeadPositionRepository: Repository<SubteamLeadPosition>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createSubteam(
    teamId: string,
    userId: string,
    createDto: CreateSubteamDto,
  ): Promise<SubteamResponseDto> {
    // Verify user is team admin
    await this.verifyTeamAdmin(teamId, userId);

    // Create subteam
    const subteam = this.subteamRepository.create({
      name: createDto.name,
      description: createDto.description || null,
      teamId,
      validRoles: createDto.validRoles.join(','),
      createdBy: userId,
    });

    console.log('Creating subteam:', {
      name: subteam.name,
      description: subteam.description,
      teamId: subteam.teamId,
      validRoles: subteam.validRoles,
      createdBy: subteam.createdBy,
      userId: userId,
    });

    const savedSubteam = await this.subteamRepository.save(subteam);

    // Create lead positions if provided
    if (createDto.leadPositions && createDto.leadPositions.length > 0) {
      const positions = createDto.leadPositions.map((pos) =>
        this.subteamLeadPositionRepository.create({
          subteamId: savedSubteam.id,
          title: pos.title,
          requiredRole: pos.requiredRole,
          userId: pos.userId || null,
        }),
      );
      await this.subteamLeadPositionRepository.save(positions);
    }

    return this.getSubteam(savedSubteam.id);
  }

  async getSubteam(subteamId: string): Promise<SubteamResponseDto> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
      relations: ['members', 'leadPositions'],
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    return this.transformToResponse(subteam);
  }

  async getTeamSubteams(teamId: string): Promise<SubteamResponseDto[]> {
    const subteams = await this.subteamRepository.find({
      where: { teamId },
      relations: ['members', 'leadPositions'],
      order: { name: 'ASC' },
    });

    return Promise.all(subteams.map((s) => this.transformToResponse(s)));
  }

  async updateSubteam(
    subteamId: string,
    userId: string,
    updateDto: UpdateSubteamDto,
  ): Promise<SubteamResponseDto> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    // Verify user is team admin
    await this.verifyTeamAdmin(subteam.teamId, userId);

    // Update basic fields
    if (updateDto.name) subteam.name = updateDto.name;
    if (updateDto.description !== undefined) subteam.description = updateDto.description;
    if (updateDto.validRoles) subteam.validRoles = updateDto.validRoles.join(',');

    await this.subteamRepository.save(subteam);

    // Update lead positions if provided
    if (updateDto.leadPositions) {
      // Delete existing positions
      await this.subteamLeadPositionRepository.delete({ subteamId });

      // Create new positions
      const positions = updateDto.leadPositions.map((pos) =>
        this.subteamLeadPositionRepository.create({
          subteamId: subteam.id,
          title: pos.title,
          requiredRole: pos.requiredRole,
          userId: pos.userId || null,
        }),
      );
      await this.subteamLeadPositionRepository.save(positions);
    }

    return this.getSubteam(subteamId);
  }

  async deleteSubteam(subteamId: string, userId: string): Promise<void> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    // Verify user is team admin
    await this.verifyTeamAdmin(subteam.teamId, userId);

    await this.subteamRepository.remove(subteam);
  }

  async addMembers(
    subteamId: string,
    userId: string,
    addDto: AddSubteamMembersDto,
  ): Promise<SubteamResponseDto> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    // Verify user is team admin or subteam lead
    await this.verifySubteamEditPermission(subteam.teamId, subteamId, userId);

    // Verify all users are members of the team
    for (const userIdToAdd of addDto.userIds) {
      const teamMembership = await this.userTeamRepository.findOne({
        where: { teamId: subteam.teamId, userId: userIdToAdd },
      });

      if (!teamMembership) {
        throw new BadRequestException(`User ${userIdToAdd} is not a member of this team`);
      }

      // Check if already a member
      const existingMember = await this.subteamMemberRepository.findOne({
        where: { subteamId, userId: userIdToAdd },
      });

      if (!existingMember) {
        const member = this.subteamMemberRepository.create({
          subteamId,
          userId: userIdToAdd,
        });
        await this.subteamMemberRepository.save(member);
      }
    }

    return this.getSubteam(subteamId);
  }

  async removeMember(
    subteamId: string,
    userId: string,
    removeDto: RemoveSubteamMemberDto,
  ): Promise<SubteamResponseDto> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    // Verify user is team admin or subteam lead
    await this.verifySubteamEditPermission(subteam.teamId, subteamId, userId);

    const member = await this.subteamMemberRepository.findOne({
      where: { subteamId, userId: removeDto.userId },
    });

    if (member) {
      await this.subteamMemberRepository.remove(member);
    }

    return this.getSubteam(subteamId);
  }

  async updateLeadPosition(
    subteamId: string,
    userId: string,
    updateDto: UpdateLeadPositionDto,
  ): Promise<SubteamResponseDto> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    // Verify user is team admin
    await this.verifyTeamAdmin(subteam.teamId, userId);

    const position = await this.subteamLeadPositionRepository.findOne({
      where: { id: updateDto.positionId, subteamId },
    });

    if (!position) {
      throw new NotFoundException('Lead position not found');
    }

    // Verify user meets role requirement if assigning someone
    if (updateDto.userId) {
      const teamMembership = await this.userTeamRepository.findOne({
        where: { teamId: subteam.teamId, userId: updateDto.userId },
      });

      if (!teamMembership) {
        throw new BadRequestException('User is not a member of this team');
      }

      const userRoles = teamMembership.roles.split(',');
      if (!userRoles.includes(position.requiredRole)) {
        throw new BadRequestException(
          `User does not have the required role: ${position.requiredRole}`,
        );
      }
    }

    position.userId = updateDto.userId || null;
    await this.subteamLeadPositionRepository.save(position);

    return this.getSubteam(subteamId);
  }

  async deleteLeadPosition(
    subteamId: string,
    positionId: string,
    userId: string,
  ): Promise<SubteamResponseDto> {
    const subteam = await this.subteamRepository.findOne({
      where: { id: subteamId },
    });

    if (!subteam) {
      throw new NotFoundException('Subteam not found');
    }

    // Verify user is team admin
    await this.verifyTeamAdmin(subteam.teamId, userId);

    const position = await this.subteamLeadPositionRepository.findOne({
      where: { id: positionId, subteamId },
    });

    if (!position) {
      throw new NotFoundException('Lead position not found');
    }

    await this.subteamLeadPositionRepository.remove(position);

    return this.getSubteam(subteamId);
  }

  private async verifyTeamAdmin(teamId: string, userId: string): Promise<void> {
    const membership = await this.userTeamRepository.findOne({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this team');
    }

    const roles = membership.roles.split(',');
    if (!roles.includes('Administrator')) {
      throw new ForbiddenException('User is not a team administrator');
    }
  }

  private async verifySubteamEditPermission(
    teamId: string,
    subteamId: string,
    userId: string,
  ): Promise<void> {
    // Check if user is team admin
    const membership = await this.userTeamRepository.findOne({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this team');
    }

    const roles = membership.roles.split(',');
    if (roles.includes('Administrator')) {
      return; // Team admins have permission
    }

    // Check if user is a subteam lead
    const leadPosition = await this.subteamLeadPositionRepository.findOne({
      where: { subteamId, userId },
    });

    if (!leadPosition) {
      throw new ForbiddenException('User is not authorized to edit this subteam');
    }
  }

  private async transformToResponse(subteam: Subteam): Promise<SubteamResponseDto> {
    // Get all user IDs we need to fetch
    const userIds = new Set<string>();
    
    if (subteam.members) {
      subteam.members.forEach((m) => userIds.add(m.userId));
    }
    
    if (subteam.leadPositions) {
      subteam.leadPositions.forEach((p) => {
        if (p.userId) userIds.add(p.userId);
      });
    }

    // Fetch all users at once
    const users = await this.userRepository.find({
      where: { id: In(Array.from(userIds)) },
      relations: ['emails'],
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Transform members
    const members: SubteamMemberDto[] = (subteam.members || []).map((m) => {
      const user = userMap.get(m.userId);
      return {
        id: m.id,
        userId: m.userId,
        userName: user ? user.fullName : 'Unknown',
        userEmail: user ? user.primaryEmail : 'Unknown',
        addedAt: m.addedAt,
      };
    });

    // Transform lead positions
    const leadPositions: SubteamLeadPositionDto[] = (subteam.leadPositions || []).map((p) => {
      const user = p.userId ? userMap.get(p.userId) : null;
      return {
        id: p.id,
        title: p.title,
        requiredRole: p.requiredRole,
        userId: p.userId,
        userName: user ? user.fullName : null,
        userEmail: user ? user.primaryEmail : null,
      };
    });

    return {
      id: subteam.id,
      name: subteam.name,
      description: subteam.description,
      teamId: subteam.teamId,
      validRoles: subteam.validRoles.split(','),
      createdBy: subteam.createdBy,
      members,
      leadPositions,
      createdAt: subteam.createdAt,
      updatedAt: subteam.updatedAt,
    };
  }
}
