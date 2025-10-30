import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamLinksController } from './team-links.controller';
import { TeamLinksService } from './team-links.service';
import { TeamLink } from './entities/team-link.entity';
import { UserTeam } from '../teams/entities/user-team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TeamLink, UserTeam])],
  controllers: [TeamLinksController],
  providers: [TeamLinksService],
  exports: [TeamLinksService],
})
export class TeamLinksModule {}
