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

@Controller('teams/:teamId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

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
