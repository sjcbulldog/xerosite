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
    // Verify user has permission to view messages for this team
    await this.verifyMessagePermission(userId, teamId);

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

    return filteredMessages.map((message) =>
      this.transformToResponse(message, message.sender, userGroupMap),
    );
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

    // This is a simplified implementation
    // In a real implementation, you would need to evaluate the user group's visibility rules
    // to determine which users are included
    return this.getAllTeamMembers(teamId);
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
      const apiUrl = this.configService.get('email.apiUrl');
      
      // Separate small and large attachments
      const emailAttachments: any[] = [];
      const largeAttachments: Array<{ filename: string; downloadUrl: string }> = [];

      if (attachmentFileIds && attachmentFileIds.length > 0) {
        for (const fileId of attachmentFileIds) {
          try {
            const { file, data } = await this.fileStorageService.getFile(fileId);
            
            // Check file size
            if (file.fileSize > MAX_ATTACHMENT_SIZE) {
              // Large file - generate download link
              const downloadUrl = `${apiUrl}/api/teams/${message.teamId}/messages/${message.id}/attachments/${fileId}/download`;
              largeAttachments.push({
                filename: file.originalFilename,
                downloadUrl,
              });
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

      // Generate email content with download links for large files
      const emailContent = this.generateEmailContent(message, sender, team, largeAttachments);

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
    largeAttachments?: Array<{ filename: string; downloadUrl: string }>,
  ): string {
    let attachmentSection = '';
    
    if (largeAttachments && largeAttachments.length > 0) {
      const attachmentLinks = largeAttachments
        .map(
          (att) =>
            `<li><a href="${att.downloadUrl}" style="color: #667eea; text-decoration: none;">${att.filename}</a></li>`,
        )
        .join('');
      
      attachmentSection = `
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <h4 style="color: #333; margin: 0 0 10px 0;">Large Attachments (Download Required)</h4>
          <p style="color: #666; font-size: 0.9em; margin: 0 0 10px 0;">
            The following attachments exceed 1 MB and must be downloaded:
          </p>
          <ul style="color: #333; margin: 0;">
            ${attachmentLinks}
          </ul>
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
          const matches = await this.isUserInVisibilityRules(userId, userGroup.visibilityRules, userTeam, teamId);
          if (matches) {
            filteredMessages.push(message);
          }
        }
      }
    }

    return filteredMessages;
  }

  private async isUserInVisibilityRules(
    userId: string,
    visibilityRules: any,
    userTeam: UserTeam | null,
    teamId: string,
  ): Promise<boolean> {
    if (!visibilityRules || !visibilityRules.rows) {
      return false;
    }

    // Check each visibility row (OR logic between rows)
    for (const row of visibilityRules.rows) {
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

  private transformToResponse(
    message: TeamMessage,
    sender: User,
    userGroupMap?: Map<string, string>,
  ): MessageResponseDto {
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
      sentAt: message.sentAt,
      errorMessage: message.errorMessage,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
