import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMediaController } from './team-media.controller';
import { TeamMediaService } from './team-media.service';
import { TeamMedia } from './entities/team-media.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { User } from '../users/entities/user.entity';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamMedia, UserTeam, User]),
    FileStorageModule,
    AuthModule,
  ],
  controllers: [TeamMediaController],
  providers: [TeamMediaService],
  exports: [TeamMediaService],
})
export class TeamMediaModule {}
