import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MessageRecipientType } from '../entities/team-message.entity';

export class SendMessageDto {
  @IsUUID()
  teamId: string;

  @IsString()
  subject: string;

  @IsString()
  content: string;

  @IsEnum(MessageRecipientType)
  recipientType: MessageRecipientType;

  @IsOptional()
  @IsUUID()
  userGroupId?: string;
}

export class MessageResponseDto {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
  recipientType: MessageRecipientType;
  userGroupId?: string;
  userGroupName?: string;
  recipientCount: number;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
  }>;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetMessagesQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
