import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto, MessageResponseDto, GetMessagesQueryDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('teams/:teamId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Ensure the teamId from the URL matches the DTO
    sendMessageDto.teamId = teamId;
    return this.messagesService.sendMessage(req.user.id, sendMessageDto);
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
