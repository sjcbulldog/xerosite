import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { SubteamsService } from './subteams.service';
import { SubteamsController } from './subteams.controller';
import { UserGroupsService } from './user-groups.service';
import { UserGroupsController } from './user-groups.controller';
import { Team } from './entities/team.entity';
import { UserTeam } from './entities/user-team.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { Subteam } from './entities/subteam.entity';
import { SubteamMember } from './entities/subteam-member.entity';
import { SubteamLeadPosition } from './entities/subteam-lead-position.entity';
import { UserPermission } from './entities/user-permission.entity';
<<<<<<< HEAD
=======
import { UserGroup } from './entities/user-group.entity';
>>>>>>> butch
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
      UserPermission,
<<<<<<< HEAD
=======
      UserGroup,
>>>>>>> butch
    ]),
    EmailModule,
    UsersModule,
  ],
  controllers: [TeamsController, SubteamsController, UserGroupsController],
  providers: [TeamsService, SubteamsService, UserGroupsService],
  exports: [TeamsService, SubteamsService, UserGroupsService],
})
export class TeamsModule {}
