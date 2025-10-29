import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGroup } from './entities/user-group.entity';
import { UserTeam } from './entities/user-team.entity';
import { UserPermission } from './entities/user-permission.entity';
import { TeamPermission } from './enums/team-permission.enum';
import { MembershipStatus } from './enums/membership-status.enum';
import { CreateUserGroupDto, UpdateUserGroupDto, UserGroupResponseDto } from './dto/user-group.dto';

@Injectable()
export class UserGroupsService {
  constructor(
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
  ) {}

  async createUserGroup(
    teamId: string,
    userId: string,
    createDto: CreateUserGroupDto,
  ): Promise<UserGroupResponseDto> {
    // Check if user has permission to create this type of group
    if (createDto.isPublic) {
      await this.verifyPublicGroupPermission(teamId, userId);
    } else {
      // For private groups, just verify they're a member with event/message permissions
      await this.verifyEventOrMessagePermission(teamId, userId);
    }

    // Create user group
    const userGroup = this.userGroupRepository.create({
      teamId,
      name: createDto.name,
      isPublic: createDto.isPublic,
      createdBy: userId,
      visibilityRules: createDto.visibilityRules,
    });

    const saved = await this.userGroupRepository.save(userGroup);
    return this.transformToResponseDto(saved);
  }

  async getUserGroups(teamId: string, userId: string): Promise<UserGroupResponseDto[]> {
    // Get all public groups and user's private groups
    const groups = await this.userGroupRepository.find({
      where: [
        { teamId, isPublic: true },
        { teamId, isPublic: false, createdBy: userId },
      ],
    });

    return groups.map((group) => this.transformToResponseDto(group));
  }

  async getUserGroup(groupId: string, userId: string): Promise<UserGroupResponseDto> {
    const group = await this.userGroupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('User group not found');
    }

    // Verify access - must be public or created by user
    if (!group.isPublic && group.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this user group');
    }

    return this.transformToResponseDto(group);
  }

  async updateUserGroup(
    groupId: string,
    userId: string,
    updateDto: UpdateUserGroupDto,
  ): Promise<UserGroupResponseDto> {
    const group = await this.userGroupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('User group not found');
    }

    // Only creator can update their group
    if (group.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can update this user group');
    }

    // If changing to public, verify permission
    if (updateDto.isPublic !== undefined && updateDto.isPublic && !group.isPublic) {
      await this.verifyPublicGroupPermission(group.teamId, userId);
    }

    // Update fields
    if (updateDto.name !== undefined) {
      group.name = updateDto.name;
    }
    if (updateDto.isPublic !== undefined) {
      group.isPublic = updateDto.isPublic;
    }
    if (updateDto.visibilityRules !== undefined) {
      group.visibilityRules = updateDto.visibilityRules;
    }

    const updated = await this.userGroupRepository.save(group);
    return this.transformToResponseDto(updated);
  }

  async deleteUserGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.userGroupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('User group not found');
    }

    // Only creator can delete their group
    if (group.createdBy !== userId) {
      throw new ForbiddenException('Only the creator can delete this user group');
    }

    await this.userGroupRepository.remove(group);
  }

  private async verifyPublicGroupPermission(teamId: string, userId: string): Promise<void> {
    // Check if user is a team admin or has CREATE_PUBLIC_USER_GROUPS permission
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    if (!userTeam) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Check if user is team administrator
    if (userTeam.getRolesArray().includes('Administrator')) {
      return;
    }

    // Check if user has CREATE_PUBLIC_USER_GROUPS permission
    const permission = await this.userPermissionRepository.findOne({
      where: {
        userId,
        teamId,
        permission: TeamPermission.CREATE_PUBLIC_USER_GROUPS,
        enabled: true,
      },
    });

    if (!permission) {
      throw new ForbiddenException('You do not have permission to create public user groups');
    }
  }

  private async verifyEventOrMessagePermission(teamId: string, userId: string): Promise<void> {
    // Check if user has SCHEDULE_EVENTS or SEND_MESSAGES permission
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    if (!userTeam) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Admins always have permission
    if (userTeam.getRolesArray().includes('Administrator')) {
      return;
    }

    // Check for either permission
    const permissions = await this.userPermissionRepository.find({
      where: [
        { userId, teamId, permission: TeamPermission.SCHEDULE_EVENTS, enabled: true },
        { userId, teamId, permission: TeamPermission.SEND_MESSAGES, enabled: true },
      ],
    });

    if (permissions.length === 0) {
      throw new ForbiddenException(
        'You do not have permission to create user groups (requires event or message permissions)',
      );
    }
  }

  private transformToResponseDto(userGroup: UserGroup): UserGroupResponseDto {
    return {
      id: userGroup.id,
      teamId: userGroup.teamId,
      name: userGroup.name,
      isPublic: userGroup.isPublic,
      createdBy: userGroup.createdBy,
      visibilityRules: userGroup.visibilityRules,
      createdAt: userGroup.createdAt,
      updatedAt: userGroup.updatedAt,
    };
  }
}
