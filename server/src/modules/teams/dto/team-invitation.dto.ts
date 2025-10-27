import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class SendInvitationDto {
  @IsEmail()
  email: string;
}

export class TeamInvitationResponseDto {
  id: string;
  teamId: string;
  teamName?: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateInvitationStatusDto {
  @IsEnum(['accepted', 'declined'])
  status: 'accepted' | 'declined';
}
