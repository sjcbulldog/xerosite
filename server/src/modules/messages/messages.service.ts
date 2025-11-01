import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TeamMessage, MessageRecipientType } from './entities/team-message.entity';
import { SendMessageDto, MessageResponseDto, GetMessagesQueryDto } from './dto/message.dto';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { UserPermission } from '../teams/entities/user-permission.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { SubteamMember } from '../teams/entities/subteam-member.entity';
import { SubteamLeadPosition } from '../teams/entities/subteam-lead-position.entity';
import { MembershipStatus } from '../teams/enums/membership-status.enum';
import { EmailService } from '../email/email.service';
import { FileStorageService } from '../file-storage/file-storage.service';
import { DownloadTokenService } from './download-token.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(TeamMessage)
    private readonly messageRepository: Repository<TeamMessage>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(SubteamMember)
    private readonly subteamMemberRepository: Repository<SubteamMember>,
    @InjectRepository(SubteamLeadPosition)
    private readonly subteamLeadPositionRepository: Repository<SubteamLeadPosition>,
    private readonly emailService: EmailService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
    private readonly downloadTokenService: DownloadTokenService,
  ) {}

  async sendMessage(
    senderId: string,
    sendMessageDto: SendMessageDto,
    files?: any[],
  ): Promise<MessageResponseDto> {
    // Verify the sender has permission to send messages
    await this.verifyMessagePermission(senderId, sendMessageDto.teamId);

    // Get team and sender info
    const team = await this.teamRepository.findOne({
      where: { id: sendMessageDto.teamId },
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const sender = await this.userRepository.findOne({
      where: { id: senderId },
    });
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Get recipients based on recipient type
    const recipients = await this.getMessageRecipients(sendMessageDto);

    // Store attachments in file storage system
    const attachmentFileIds: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const storedFile = await this.fileStorageService.storeFile(
          file.buffer,
          file.originalname,
          senderId,
          'messages',
          file.mimetype,
        );
        attachmentFileIds.push(storedFile.id);
      }
    }

    // Create message record
    const message = this.messageRepository.create({
      teamId: sendMessageDto.teamId,
      senderId,
      subject: sendMessageDto.subject,
      content: sendMessageDto.content,
      recipientType: sendMessageDto.recipientType,
      userGroupId: sendMessageDto.userGroupId || null,
      attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
      recipientDetails: {
        recipientCount: recipients.length,
        recipientEmails: recipients.map((r) => r.primaryEmail || r.emails?.[0]?.email || 'unknown'),
      },
    });

    const savedMessage = await this.messageRepository.save(message);

    // Send emails asynchronously with attachments
    this.sendEmailsToRecipients(savedMessage, sender, team, recipients, attachmentFileIds);

    return this.transformToResponse(savedMessage, sender);
  }

  async getTeamMessages(
    userId: string,
    teamId: string,
    query: GetMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    // Verify user is a team member (anyone can view their received messages)
    await this.verifyTeamMembership(userId, teamId);

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.teamId = :teamId', { teamId })
      .orderBy('message.createdAt', 'DESC');

    // Apply search filter
    if (query.search) {
      queryBuilder.andWhere('(message.subject LIKE :search OR message.content LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Apply date filters
    if (query.startDate) {
      queryBuilder.andWhere('message.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('message.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    const allMessages = await queryBuilder.getMany();

    // Filter messages to only include those where the user is sender or recipient
    const filteredMessages = await this.filterMessagesForUser(allMessages, userId, teamId);

    // Get user group names for messages that use user groups
    const userGroupIds = filteredMessages
      .filter((m) => m.userGroupId)
      .map((m) => m.userGroupId!)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    const userGroups =
      userGroupIds.length > 0
        ? await this.userGroupRepository.find({
            where: { id: In(userGroupIds) },
          })
        : [];

    const userGroupMap = new Map(userGroups.map((ug) => [ug.id, ug.name]));

    // Transform messages and include attachment details
    const result: MessageResponseDto[] = [];
    for (const message of filteredMessages) {
      const dto = this.transformToResponse(message, message.sender, userGroupMap, userId);

      // Add attachment details if message has attachments
      if (message.attachmentFileIds && message.attachmentFileIds.length > 0) {
        dto.attachments = [];
        for (const fileId of message.attachmentFileIds) {
          try {
            const { file } = await this.fileStorageService.getFile(fileId);
            dto.attachments.push({
              fileId: file.id,
              filename: file.storedFilename,
              originalName: file.originalFilename,
              mimetype: file.mimeType,
              size: file.fileSize,
            });
          } catch (error) {
            // Skip files that can't be retrieved
            console.error(`Error retrieving file ${fileId}:`, error);
          }
        }
      }

      result.push(dto);
    }

    return result;
  }

  private async verifyTeamMembership(userId: string, teamId: string): Promise<void> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not an active member of this team');
    }
  }

  private async verifyMessagePermission(userId: string, teamId: string): Promise<void> {
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // Check if user is admin
    const isAdmin = userTeam.getRolesArray().includes('Administrator');

    if (isAdmin) {
      return; // Administrators always have permission
    }

    // Check if user has SEND_MESSAGES permission
    const permission = await this.userPermissionRepository.findOne({
      where: { userId, teamId, permission: 'SEND_MESSAGES' as any, enabled: true },
    });

    if (!permission) {
      throw new ForbiddenException('User does not have permission to send messages');
    }
  }

  private async getMessageRecipients(sendMessageDto: SendMessageDto): Promise<User[]> {
    if (sendMessageDto.recipientType === MessageRecipientType.ALL_TEAM_MEMBERS) {
      return this.getAllTeamMembers(sendMessageDto.teamId);
    } else if (sendMessageDto.recipientType === MessageRecipientType.USER_GROUP) {
      if (!sendMessageDto.userGroupId) {
        throw new Error('User group ID is required for user group recipient type');
      }
      return this.getUserGroupMembers(sendMessageDto.userGroupId, sendMessageDto.teamId);
    }

    return [];
  }

  private async getAllTeamMembers(teamId: string): Promise<User[]> {
    const userTeams = await this.userTeamRepository.find({
      where: {
        teamId,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['user', 'user.emails'],
    });

    return userTeams.filter((ut) => ut.user && ut.user.isActive).map((ut) => ut.user);
  }

  private async getUserGroupMembers(userGroupId: string, teamId: string): Promise<User[]> {
    const userGroup = await this.userGroupRepository.findOne({
      where: { id: userGroupId, teamId },
    });

    if (!userGroup) {
      throw new NotFoundException('User group not found');
    }

    console.log('='.repeat(80));
    console.log('[UserGroupMessage] User Group Selected:', {
      id: userGroup.id,
      name: userGroup.name,
      teamId: userGroup.teamId,
    });

    // Get all active team members
    const allMembers = await this.getAllTeamMembers(teamId);
    console.log(`[UserGroupMessage] Total active team members: ${allMembers.length}`);

    // Handle both formats: direct rows or nested ruleSet.rows
    const rows = userGroup.visibilityRules?.rows || userGroup.visibilityRules?.ruleSet?.rows;

    // If no visibility rules, return all members
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log('[UserGroupMessage] No visibility rules found - including all team members');
      console.log('='.repeat(80));
      return allMembers;
    }

    console.log(`[UserGroupMessage] Visibility rules found with ${rows.length} row(s)`);

    // Get all active UserTeam records for this team (for role lookup)
    const userTeams = await this.userTeamRepository.find({
      where: { teamId, status: MembershipStatus.ACTIVE },
    });

    // Create a map for quick lookup
    const userTeamMap = new Map<string, UserTeam>();
    userTeams.forEach((ut) => userTeamMap.set(ut.userId, ut));

    // Filter members based on visibility rules
    const matchingMembers = [];
    for (const user of allMembers) {
      const userTeam = userTeamMap.get(user.id) || null;
      const matches = await this.isUserInVisibilityRules(
        user.id,
        userGroup.visibilityRules,
        userTeam,
        teamId,
      );
      if (matches) {
        matchingMembers.push(user);
      }
    }

    console.log(`[UserGroupMessage] Users matching visibility rules: ${matchingMembers.length}`);
    matchingMembers.forEach((user, idx) => {
      const userTeam = userTeamMap.get(user.id);
      const roles = userTeam ? userTeam.getRolesArray() : [];
      console.log(
        `[UserGroupMessage]   ${idx + 1}. ${user.firstName} ${user.lastName} (${user.primaryEmail || 'no email'}) - Roles: [${roles.join(', ')}]`,
      );
    });
    console.log('='.repeat(80));

    return matchingMembers;
  }

  private async sendEmailsToRecipients(
    message: TeamMessage,
    sender: User,
    team: Team,
    recipients: User[],
    attachmentFileIds?: string[],
  ): Promise<void> {
    try {
      const MAX_ATTACHMENT_SIZE = 1 * 1024 * 1024; // 1 MB

      // Separate small and large attachments
      const emailAttachments: any[] = [];
      const largeAttachmentNames: string[] = [];

      if (attachmentFileIds && attachmentFileIds.length > 0) {
        for (const fileId of attachmentFileIds) {
          try {
            const { file, data } = await this.fileStorageService.getFile(fileId);

            // Check file size
            if (file.fileSize > MAX_ATTACHMENT_SIZE) {
              // Large file - just add to list for notification
              largeAttachmentNames.push(file.originalFilename);
            } else {
              // Small file - attach to email
              emailAttachments.push({
                filename: file.originalFilename,
                content: data.toString('base64'),
                contentType: file.mimeType || 'application/octet-stream',
              });
            }
          } catch (error) {
            console.error(`Failed to fetch attachment ${fileId}:`, error);
          }
        }
      }

      // Generate email content with notification for large files
      const emailContent = this.generateEmailContent(message, sender, team, largeAttachmentNames);

      const emailPromises = recipients.map((recipient) => {
        const recipientEmail = recipient.primaryEmail || recipient.emails?.[0]?.email;
        if (!recipientEmail) {
          return Promise.resolve();
        }

        return this.emailService.sendEmailWithAttachments({
          to: recipientEmail,
          subject: `[${team.name}] ${message.subject}`,
          html: emailContent,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });
      });

      await Promise.all(emailPromises);

      // Update message as sent
      await this.messageRepository.update(message.id, {
        sentAt: new Date(),
      });
    } catch (error) {
      // Update message with error
      await this.messageRepository.update(message.id, {
        errorMessage: error.message,
      });
    }
  }

  private generateEmailContent(
    message: TeamMessage,
    sender: User,
    team: Team,
    largeAttachmentNames?: string[],
  ): string {
    let attachmentSection = '';

    if (largeAttachmentNames && largeAttachmentNames.length > 0) {
      const attachmentList = largeAttachmentNames
        .map((filename) => `<li>${filename}</li>`)
        .join('');

      attachmentSection = `
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
          <h4 style="color: #856404; margin: 0 0 10px 0;">📎 Large Attachments Available</h4>
          <p style="color: #856404; margin: 0 0 10px 0;">
            This message contains the following large attachments:
          </p>
          <ul style="color: #856404; margin: 0 0 10px 0;">
            ${attachmentList}
          </ul>
          <p style="color: #856404; font-weight: 600; margin: 0;">
            Please log in to the team site to view and download these attachments.
          </p>
        </div>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0 0 10px 0;">Team Message from ${team.name}</h2>
          <p style="color: #666; margin: 0;">
            From: ${sender.firstName} ${sender.lastName} (${sender.primaryEmail})
          </p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">${message.subject}</h3>
          <div style="color: #333; line-height: 1.6;">
            ${message.content.replace(/\n/g, '<br>')}
          </div>
        </div>
        
        ${attachmentSection}
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 0.9em; margin: 0;">
            This message was sent via the ${team.name} team messaging system.
          </p>
        </div>
      </div>
    `;
  }

  private async filterMessagesForUser(
    messages: TeamMessage[],
    userId: string,
    teamId: string,
  ): Promise<TeamMessage[]> {
    if (messages.length === 0) return messages;

    // Check if user is an active team member for ALL_TEAM_MEMBERS messages
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    // Get all user groups that might be referenced in messages
    const userGroupIds = messages
      .filter((m) => m.userGroupId)
      .map((m) => m.userGroupId!)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    const userGroups =
      userGroupIds.length > 0
        ? await this.userGroupRepository.find({
            where: { id: In(userGroupIds) },
          })
        : [];

    const filteredMessages = [];
    for (const message of messages) {
      // Include messages sent by the user
      if (message.senderId === userId) {
        filteredMessages.push(message);
        continue;
      }

      // Check if user is a recipient
      if (message.recipientType === MessageRecipientType.ALL_TEAM_MEMBERS) {
        // User receives message if they are an active team member
        if (userTeam !== null) {
          filteredMessages.push(message);
        }
      } else if (message.recipientType === MessageRecipientType.USER_GROUP && message.userGroupId) {
        // Check if user is in the user group
        const userGroup = userGroups.find((ug) => ug.id === message.userGroupId);
        if (userGroup) {
          const matches = await this.isUserInVisibilityRules(
            userId,
            userGroup.visibilityRules,
            userTeam,
            teamId,
          );
          if (matches) {
            filteredMessages.push(message);
          }
        }
      }
    }

    return filteredMessages;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async isUserInVisibilityRules(
    userId: string,
    visibilityRules: any,
    userTeam: UserTeam | null,
    _teamId: string,
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
            criterionMatches = true; // User matches if it's "all users"
            break;
          case 'select_users':
            criterionMatches = criterion.userIds?.includes(userId) || false;
            break;
          case 'roles':
            // Get user's roles from userTeam
            if (userTeam) {
              const userRoles = userTeam.getRolesArray();

              // Special case: if no roles are selected in the criterion,
              // match only users who have no roles assigned
              if (!criterion.roles || criterion.roles.length === 0) {
                criterionMatches = userRoles.length === 0;
              } else {
                // Match if user has at least one of the specified roles
                criterionMatches = criterion.roles.some((role: string) => userRoles.includes(role));
              }
            } else {
              // User is not a team member, so they don't match
              criterionMatches = false;
            }
            break;
          case 'subteam_members':
            // Check if user is a member of any of the specified subteams
            if (criterion.subteamIds && criterion.subteamIds.length > 0) {
              const membershipCount = await this.subteamMemberRepository.count({
                where: {
                  userId,
                  subteamId: In(criterion.subteamIds),
                },
              });
              criterionMatches = membershipCount > 0;
            } else {
              criterionMatches = false;
            }
            break;
          case 'subteam_leads':
            // Check if user is assigned as a lead in any of the specified subteams
            if (criterion.subteamIds && criterion.subteamIds.length > 0) {
              const leadCount = await this.subteamLeadPositionRepository.count({
                where: {
                  userId,
                  subteamId: In(criterion.subteamIds),
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
        return true; // Found a matching row
      }
    }

    return false; // No rows matched
  }

  async downloadAttachment(
    userId: string,
    teamId: string,
    messageId: string,
    fileId: string,
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    // Verify user is a team member
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // Verify the message exists and belongs to the team
    const message = await this.messageRepository.findOne({
      where: { id: messageId, teamId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify the user is either the sender or a recipient of the message
    const isSender = message.senderId === userId;
    let isRecipient = false;

    if (!isSender) {
      // Check if user is a recipient based on recipient type
      if (message.recipientType === MessageRecipientType.ALL_TEAM_MEMBERS) {
        // User is a recipient if they're an active team member (already verified above)
        isRecipient = true;
      } else if (message.recipientType === MessageRecipientType.USER_GROUP && message.userGroupId) {
        // Check if user matches the user group's visibility rules
        const userGroup = await this.userGroupRepository.findOne({
          where: { id: message.userGroupId, teamId },
        });

        if (userGroup) {
          isRecipient = await this.isUserInVisibilityRules(
            userId,
            userGroup.visibilityRules,
            userTeam,
            teamId,
          );
        }
      }
    }

    if (!isSender && !isRecipient) {
      throw new ForbiddenException('User is not authorized to download this attachment');
    }

    // Verify the file is attached to this message
    const attachmentFileIds = message.attachmentFileIds || [];
    if (!attachmentFileIds.includes(fileId)) {
      throw new ForbiddenException('File is not attached to this message');
    }

    // Retrieve the file
    const { file, data } = await this.fileStorageService.getFile(fileId);

    return {
      data,
      filename: file.originalFilename,
      mimeType: file.mimeType,
    };
  }

  /**
   * Download an attachment using a token (no user authentication required)
   * Used for email links with temporary download tokens
   */
  async downloadAttachmentByToken(
    teamId: string,
    messageId: string,
    fileId: string,
  ): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    // Verify the message exists and belongs to the team
    const message = await this.messageRepository.findOne({
      where: { id: messageId, teamId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify the file is attached to this message
    const attachmentFileIds = message.attachmentFileIds || [];
    if (!attachmentFileIds.includes(fileId)) {
      throw new ForbiddenException('File is not attached to this message');
    }

    // Retrieve the file
    const { file, data } = await this.fileStorageService.getFile(fileId);

    return {
      data,
      filename: file.originalFilename,
      mimeType: file.mimeType,
    };
  }

  /**
   * Get messages with attachments that the user has not viewed yet
   */
  async getMessagesWithUnseenAttachments(
    userId: string,
    teamId: string,
  ): Promise<MessageResponseDto[]> {
    // Verify user is a team member
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // Find messages that have attachments and haven't been viewed by this user
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.teamId = :teamId', { teamId })
      .andWhere('message.attachmentFileIds IS NOT NULL')
      .andWhere('message.attachmentFileIds != :emptyArray', { emptyArray: '[]' })
      .andWhere(
        '(message.viewedByRecipients IS NULL OR NOT FIND_IN_SET(:userId, message.viewedByRecipients))',
        { userId },
      )
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    // Filter to only messages where this user is a recipient (not sender)
    const recipientMessages: TeamMessage[] = [];
    for (const message of messages) {
      // Skip messages sent by this user
      if (message.senderId === userId) {
        continue;
      }

      // Check if user is a recipient based on recipient type
      let isRecipient = false;

      if (message.recipientType === MessageRecipientType.ALL_TEAM_MEMBERS) {
        // User is a recipient if they're an active team member (already verified above)
        isRecipient = true;
      } else if (message.recipientType === MessageRecipientType.USER_GROUP && message.userGroupId) {
        // Check if user matches the user group's visibility rules
        const userGroup = await this.userGroupRepository.findOne({
          where: { id: message.userGroupId, teamId },
        });

        if (userGroup) {
          isRecipient = await this.isUserInVisibilityRules(
            userId,
            userGroup.visibilityRules,
            userTeam,
            teamId,
          );
        }
      }

      if (isRecipient) {
        recipientMessages.push(message);
      }
    }

    // Get user group names if needed
    const userGroupIds = [
      ...new Set(recipientMessages.filter((m) => m.userGroupId).map((m) => m.userGroupId)),
    ];
    let userGroupMap: Map<string, string> | undefined;
    if (userGroupIds.length > 0) {
      const userGroups = await this.userGroupRepository.findBy({ id: In(userGroupIds) });
      userGroupMap = new Map(userGroups.map((g) => [g.id, g.name]));
    }

    // Get attachment info for all messages
    const result: MessageResponseDto[] = [];
    for (const message of recipientMessages) {
      const sender = message.sender;
      if (!sender) continue;

      const dto = this.transformToResponse(message, sender, userGroupMap, userId);

      // Add attachment details
      if (message.attachmentFileIds && message.attachmentFileIds.length > 0) {
        dto.attachments = [];
        for (const fileId of message.attachmentFileIds) {
          try {
            const { file } = await this.fileStorageService.getFile(fileId);
            dto.attachments.push({
              fileId: file.id,
              filename: file.storedFilename,
              originalName: file.originalFilename,
              mimetype: file.mimeType,
              size: file.fileSize,
            });
          } catch (error) {
            // Skip files that can't be retrieved
            console.error(`Error retrieving file ${fileId}:`, error);
          }
        }
      }

      dto.hasUnviewedAttachments = true;
      result.push(dto);
    }

    return result;
  }

  /**
   * Mark attachments as viewed by the user
   */
  async markAttachmentsAsViewed(
    userId: string,
    teamId: string,
    messageId: string,
  ): Promise<void> {
    // Verify user is a team member
    const userTeam = await this.userTeamRepository.findOne({
      where: { userId, teamId, status: MembershipStatus.ACTIVE },
    });

    if (!userTeam) {
      throw new ForbiddenException('User is not a member of this team');
    }

    // Verify the message exists and belongs to the team
    const message = await this.messageRepository.findOne({
      where: { id: messageId, teamId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Add user to viewedByRecipients if not already there
    const viewedBy = message.viewedByRecipients || [];
    if (!viewedBy.includes(userId)) {
      viewedBy.push(userId);
      message.viewedByRecipients = viewedBy;
      await this.messageRepository.save(message);
    }
  }

  private transformToResponse(
    message: TeamMessage,
    sender: User,
    userGroupMap?: Map<string, string>,
    currentUserId?: string,
  ): MessageResponseDto {
    const hasUnviewedAttachments =
      currentUserId &&
      message.attachmentFileIds &&
      message.attachmentFileIds.length > 0 &&
      (!message.viewedByRecipients || !message.viewedByRecipients.includes(currentUserId));

    return {
      id: message.id,
      teamId: message.teamId,
      senderId: message.senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderEmail: sender.primaryEmail || '',
      subject: message.subject,
      content: message.content,
      recipientType: message.recipientType,
      userGroupId: message.userGroupId,
      userGroupName:
        message.userGroupId && userGroupMap ? userGroupMap.get(message.userGroupId) : undefined,
      recipientCount: message.recipientDetails?.recipientCount || 0,
      hasUnviewedAttachments,
      sentAt: message.sentAt,
      errorMessage: message.errorMessage,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
