import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { TeamMessage } from './entities/team-message.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { UserPermission } from '../teams/entities/user-permission.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { EmailModule } from '../email/email.module';
import { FileStorageModule } from '../file-storage/file-storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamMessage,
      Team,
      User,
      UserTeam,
      UserPermission,
      UserGroup,
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
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
