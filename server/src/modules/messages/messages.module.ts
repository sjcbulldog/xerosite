import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { MessagesController, PublicDownloadController } from './messages.controller';
import { MessagesService } from './messages.service';
import { DownloadTokenService } from './download-token.service';
import { TeamMessage } from './entities/team-message.entity';
import { DownloadToken } from './entities/download-token.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { UserPermission } from '../teams/entities/user-permission.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { SubteamMember } from '../teams/entities/subteam-member.entity';
import { SubteamLeadPosition } from '../teams/entities/subteam-lead-position.entity';
import { EmailModule } from '../email/email.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamMessage,
      DownloadToken,
      Team,
      User,
      UserTeam,
      UserPermission,
      UserGroup,
      SubteamMember,
      SubteamLeadPosition,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
        files: 10, // Max 10 files
      },
    }),
    EmailModule,
    FileStorageModule,
  ],
  controllers: [MessagesController, PublicDownloadController],
  providers: [MessagesService, DownloadTokenService],
  exports: [MessagesService],
})
export class MessagesModule {}
