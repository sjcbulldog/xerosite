import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TeamEvent } from './entities/team-event.entity';
import { EventNotification } from './entities/event-notification.entity';
import { EventNotificationsService } from './event-notifications.service';
import { UserTeam } from '../teams/entities/user-team.entity';
import { User } from '../users/entities/user.entity';
import { UserPreference } from '../preferences/entities/user-preference.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamEvent,
      EventNotification,
      UserTeam,
      User,
      UserPreference,
    ]),
    EmailModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, EventNotificationsService],
  exports: [EventsService, EventNotificationsService],
})
export class EventsModule {}
