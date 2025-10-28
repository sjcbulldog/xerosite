import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { SubteamsService } from './subteams.service';
import { SubteamsController } from './subteams.controller';
import { Team } from './entities/team.entity';
import { UserTeam } from './entities/user-team.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { Subteam } from './entities/subteam.entity';
import { SubteamMember } from './entities/subteam-member.entity';
import { SubteamLeadPosition } from './entities/subteam-lead-position.entity';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      UserTeam,
      TeamInvitation,
      Subteam,
      SubteamMember,
      SubteamLeadPosition,
    ]),
    EmailModule,
    UsersModule,
  ],
  controllers: [TeamsController, SubteamsController],
  providers: [TeamsService, SubteamsService],
  exports: [TeamsService, SubteamsService],
})
export class TeamsModule {}
