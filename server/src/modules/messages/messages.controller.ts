import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { MessagesService } from './messages.service';
import { SendMessageDto, MessageResponseDto, GetMessagesQueryDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DownloadTokenService } from './download-token.service';

@Controller('teams/:teamId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly downloadTokenService: DownloadTokenService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 10)) // Max 10 files
  async sendMessage(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() body: any,
    @UploadedFiles() files: any[],
  ): Promise<MessageResponseDto> {
    // Validate file attachments
    if (files && files.length > 0) {
      const maxTotalSize = 50 * 1024 * 1024; // 50MB total (reasonable limit for uploads)

      // Check total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > maxTotalSize) {
        throw new BadRequestException(
          `Total attachment size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum of 50MB`,
        );
      }
    }

    // Construct DTO from body (handles both JSON and FormData)
    const sendMessageDto: SendMessageDto = {
      teamId: teamId,
      subject: body.subject,
      content: body.content,
      recipientType: body.recipientType,
      userGroupId: body.userGroupId || undefined,
    };

    // Validate the DTO
    const dtoObject = plainToClass(SendMessageDto, sendMessageDto);
    const errors = await validate(dtoObject);

    if (errors.length > 0) {
      const messages = errors.map((error) => Object.values(error.constraints || {})).flat();
      throw new BadRequestException(messages.join(', '));
    }

    return this.messagesService.sendMessage(req.user.id, sendMessageDto, files);
  }

  @Get()
  async getTeamMessages(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Query() query: GetMessagesQueryDto,
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.getTeamMessages(req.user.id, teamId, query);
  }

  @Get('unseen-attachments')
  async getUnseenAttachments(
    @Request() req: any,
    @Param('teamId') teamId: string,
  ): Promise<MessageResponseDto[]> {
    return this.messagesService.getMessagesWithUnseenAttachments(req.user.id, teamId);
  }

  @Post(':messageId/mark-viewed')
  async markAttachmentsAsViewed(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('messageId') messageId: string,
  ): Promise<void> {
    await this.messagesService.markAttachmentsAsViewed(req.user.id, teamId, messageId);
  }

  @Get(':messageId/attachments/:fileId/download')
  async downloadAttachment(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Param('messageId') messageId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { data, filename, mimeType } = await this.messagesService.downloadAttachment(
      req.user.id,
      teamId,
      messageId,
      fileId,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }
}

/**
 * Public download controller for token-based attachment downloads
 * This is separate from the authenticated controller to allow public access
 */
@Controller('public/download')
export class PublicDownloadController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly downloadTokenService: DownloadTokenService,
  ) {}

  @Get(':token')
  async downloadWithToken(@Param('token') token: string, @Res() res: Response): Promise<void> {
    // Validate token and get file information
    const { messageId, fileId, teamId } = await this.downloadTokenService.validateToken(token);

    // Download the file (without user authentication check)
    const { data, filename, mimeType } = await this.messagesService.downloadAttachmentByToken(
      teamId,
      messageId,
      fileId,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }
}
