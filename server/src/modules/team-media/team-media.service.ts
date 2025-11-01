import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMedia } from './entities/team-media.entity';
import { CreateTeamMediaDto, UpdateTeamMediaDto, TeamMediaResponseDto } from './dto/team-media.dto';
import { FileStorageService } from '../file-storage/file-storage.service';
import { UserTeam } from '../teams/entities/user-team.entity';
import { User } from '../users/entities/user.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { SubteamMember } from '../teams/entities/subteam-member.entity';
import { SubteamLeadPosition } from '../teams/entities/subteam-lead-position.entity';

@Injectable()
export class TeamMediaService {
  constructor(
    @InjectRepository(TeamMedia)
    private readonly teamMediaRepository: Repository<TeamMedia>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(SubteamMember)
    private readonly subteamMemberRepository: Repository<SubteamMember>,
    @InjectRepository(SubteamLeadPosition)
    private readonly subteamLeadPositionRepository: Repository<SubteamLeadPosition>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async uploadFile(
    teamId: string,
    userId: string,
    file: any,
    createDto: CreateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    // Verify user is a team member
    await this.verifyTeamMembership(userId, teamId);

    // Store the file using FileStorageService
    const storedFile = await this.fileStorageService.storeFile(
      file.buffer,
      file.originalname,
      userId,
      'team-media',
      file.mimetype,
    );

    // Create the team media record
    const teamMedia = this.teamMediaRepository.create({
      teamId,
      userId,
      fileId: storedFile.id,
      title: createDto.title,
      year: createDto.year,
      userGroupId: createDto.userGroupId || null,
    });

    const saved = await this.teamMediaRepository.save(teamMedia);
    return this.transformToResponse(saved);
  }

  async findAllForTeam(teamId: string, userId: string): Promise<TeamMediaResponseDto[]> {
    try {
      // Verify user is a team member before showing media
      await this.verifyTeamMembership(userId, teamId);

      // Get all media for the team
      const mediaFiles = await this.teamMediaRepository.find({
        where: { teamId },
        relations: ['file', 'user'],
        order: { createdAt: 'DESC' },
      });

      // Get user's group memberships for filtering
      let userGroupIds: string[] = [];
      try {
        userGroupIds = await this.getUserGroupIds(userId, teamId);
      } catch (error) {
        console.error('Error getting user group IDs:', error);
        // Continue with empty userGroupIds - user will only see non-restricted media
      }

      // Filter media based on user group visibility
      const visibleMedia = mediaFiles.filter((media) => {
        // If no userGroupId set, visible to all team members
        if (!media.userGroupId) {
          return true;
        }
        // If userGroupId set, check if user is in that group
        return userGroupIds.includes(media.userGroupId);
      });

      const responses = await Promise.all(
        visibleMedia.map((media) => this.transformToResponse(media)),
      );

      return responses;
    } catch (error) {
      console.error('Error in findAllForTeam:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<TeamMedia> {
    const media = await this.teamMediaRepository.findOne({
      where: { id },
      relations: ['file', 'user'],
    });

    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    return media;
  }

  async updateTitle(
    id: string,
    userId: string,
    updateDto: UpdateTeamMediaDto,
  ): Promise<TeamMediaResponseDto> {
    const media = await this.findOne(id);

    // Only the uploader or team admin can update
    await this.verifyUpdatePermission(userId, media.teamId, media.userId);

    media.title = updateDto.title;
    if (updateDto.year !== undefined) {
      media.year = updateDto.year;
    }
    if (updateDto.userGroupId !== undefined) {
      media.userGroupId = updateDto.userGroupId || null;
    }
    const saved = await this.teamMediaRepository.save(media);
    return this.transformToResponse(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const media = await this.findOne(id);

    // Only the uploader or team admin can delete
    await this.verifyUpdatePermission(userId, media.teamId, media.userId);

    // Delete the stored file
    await this.fileStorageService.deleteFile(media.fileId);

    // Delete the team media record
    await this.teamMediaRepository.remove(media);
  }

  async downloadFile(
    id: string,
    userId: string,
  ): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
    fileSize: number;
  }> {
    const media = await this.findOne(id);

    // Verify user is a team member before allowing download
    await this.verifyTeamMembership(userId, media.teamId);

    // Verify user group visibility
    await this.verifyUserGroupAccess(userId, media.teamId, media.userGroupId);

    const { file, data } = await this.fileStorageService.getFile(media.fileId);
    return {
      data,
      filename: file.originalFilename,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  }

  private async verifyTeamMembership(userId: string, teamId: string): Promise<void> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }
  }

  private async verifyUpdatePermission(
    userId: string,
    teamId: string,
    uploaderId: string,
  ): Promise<void> {
    // Check if user is the uploader
    if (userId === uploaderId) {
      return;
    }

    // Check if user is team administrator
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    const isAdmin = userTeam.getRolesArray().includes('Administrator');

    if (!isAdmin) {
      throw new ForbiddenException('Only the uploader or team administrators can modify this file');
    }
  }

  private async transformToResponse(media: TeamMedia): Promise<TeamMediaResponseDto> {
    let userGroupName: string | null = null;

    if (media.userGroupId) {
      const userGroup = await this.userGroupRepository.findOne({
        where: { id: media.userGroupId },
      });
      userGroupName = userGroup?.name || null;
    }

    const response = {
      id: media.id,
      teamId: media.teamId,
      userId: media.userId,
      fileId: media.fileId,
      title: media.title,
      year: media.year,
      originalFilename: media.file?.originalFilename || 'unknown',
      fileSize: media.file?.fileSize || 0,
      mimeType: media.file?.mimeType || 'application/octet-stream',
      uploaderName: media.user?.fullName || 'Unknown User',
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      userGroupId: media.userGroupId,
      userGroupName,
    };

    return response;
  }

  /**
   * Get all user group IDs that a user belongs to within a team
   */
  private async getUserGroupIds(userId: string, teamId: string): Promise<string[]> {
    try {
      // Get user's team membership for role lookup
      const userTeam = await this.userTeamRepository.findOne({
        where: { userId, teamId },
      });

      if (!userTeam) {
        console.log(`[getUserGroupIds] User ${userId} not found in team ${teamId}`);
        return [];
      }

      // Get all user groups for the team
      const allUserGroups = await this.userGroupRepository.find({
        where: { teamId },
      });

      console.log(`[getUserGroupIds] Found ${allUserGroups.length} user groups for team ${teamId}`);

      const matchingGroupIds: string[] = [];

      for (const group of allUserGroups) {
        try {
          const matches = await this.isUserInVisibilityRules(
            userId,
            group.visibilityRules,
            userTeam,
            teamId,
          );
          if (matches) {
            matchingGroupIds.push(group.id);
            console.log(
              `[getUserGroupIds] User ${userId} matches group ${group.name} (${group.id})`,
            );
          }
        } catch (error) {
          console.error(
            `[getUserGroupIds] Error checking visibility rules for group ${group.id}:`,
            error,
          );
          // Continue checking other groups
        }
      }

      console.log(`[getUserGroupIds] User ${userId} belongs to ${matchingGroupIds.length} groups`);
      return matchingGroupIds;
    } catch (error) {
      console.error('[getUserGroupIds] Error:', error);
      return [];
    }
  }

  /**
   * Check if a user matches the visibility rules
   */
  private async isUserInVisibilityRules(
    userId: string,
    visibilityRules: any,
    userTeam: UserTeam | null,
    teamId: string,
  ): Promise<boolean> {
    if (!visibilityRules) {
      return false;
    }

    // Handle both formats: direct rows or nested ruleSet.rows
    const rows = visibilityRules.rows || visibilityRules.ruleSet?.rows;
    if (!rows || !Array.isArray(rows)) {
      return false;
    }

    // Check each visibility row (OR logic between rows)
    for (const row of rows) {
      if (!row.criteria) continue;

      // All criteria in a row must match (AND logic within row)
      let rowMatches = true;

      for (const criterion of row.criteria) {
        let criterionMatches = false;

        switch (criterion.type) {
          case 'all_users':
            criterionMatches = true;
            break;
          case 'select_users':
            criterionMatches = criterion.userIds?.includes(userId) || false;
            break;
          case 'roles':
            if (userTeam) {
              const userRoles = userTeam.getRolesArray();

              if (!criterion.roles || criterion.roles.length === 0) {
                criterionMatches = userRoles.length === 0;
              } else {
                criterionMatches = criterion.roles.some((role: string) => userRoles.includes(role));
              }
            } else {
              criterionMatches = false;
            }
            break;
          case 'subteam_members':
            if (criterion.subteamIds && criterion.subteamIds.length > 0) {
              const membershipCount = await this.subteamMemberRepository.count({
                where: {
                  userId,
                  subteamId: criterion.subteamIds,
                },
              });
              criterionMatches = membershipCount > 0;
            } else {
              criterionMatches = false;
            }
            break;
          case 'subteam_leads':
            if (criterion.subteamIds && criterion.subteamIds.length > 0) {
              const leadCount = await this.subteamLeadPositionRepository.count({
                where: {
                  userId,
                  subteamId: criterion.subteamIds,
                },
              });
              criterionMatches = leadCount > 0;
            } else {
              criterionMatches = false;
            }
            break;
          default:
            criterionMatches = false;
            break;
        }

        if (!criterionMatches) {
          rowMatches = false;
          break;
        }
      }

      if (rowMatches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verify that a user has access to media based on user group restrictions
   */
  private async verifyUserGroupAccess(
    userId: string,
    teamId: string,
    userGroupId: string | null,
  ): Promise<void> {
    // If no user group restriction, all team members can access
    if (!userGroupId) {
      return;
    }

    // Check if user is in the required user group
    const userGroupIds = await this.getUserGroupIds(userId, teamId);
    if (!userGroupIds.includes(userGroupId)) {
      throw new ForbiddenException('You do not have access to this media file');
    }
  }
}
