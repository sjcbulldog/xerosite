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
} from '@nestjs/common';
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
      const maxFileSize = 1 * 1024 * 1024; // 1MB per file
      const maxTotalSize = 4 * 1024 * 1024; // 4MB total

      // Check individual file sizes
      for (const file of files) {
        if (file.size > maxFileSize) {
          throw new BadRequestException(
            `File "${file.originalname}" exceeds the maximum size of 1MB`,
          );
        }
      }

      // Check total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > maxTotalSize) {
        throw new BadRequestException(
          `Total attachment size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum of 4MB`,
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
}
