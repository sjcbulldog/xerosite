import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMediaController } from './team-media.controller';
import { TeamMediaService } from './team-media.service';
import { TeamMedia } from './entities/team-media.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { User } from '../users/entities/user.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { SubteamMember } from '../teams/entities/subteam-member.entity';
import { SubteamLeadPosition } from '../teams/entities/subteam-lead-position.entity';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamMedia,
      UserTeam,
      User,
      UserGroup,
      SubteamMember,
      SubteamLeadPosition,
    ]),
    FileStorageModule,
    AuthModule,
  ],
  controllers: [TeamMediaController],
  providers: [TeamMediaService],
  exports: [TeamMediaService],
})
export class TeamMediaModule {}
