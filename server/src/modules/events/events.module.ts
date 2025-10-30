import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { AttendanceService } from './attendance.service';
import { EventsController } from './events.controller';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { TeamEvent } from './entities/team-event.entity';
import { EventNotification } from './entities/event-notification.entity';
import { EventAttendance } from './entities/event-attendance.entity';
import { EventExclusion } from './entities/event-exclusion.entity';
import { EventNotificationsService } from './event-notifications.service';
import { Team } from '../teams/entities/team.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { User } from '../users/entities/user.entity';
import { UserPreference } from '../preferences/entities/user-preference.entity';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamEvent,
      EventNotification,
      EventAttendance,
      EventExclusion,
      Team,
      UserTeam,
      UserGroup,
      User,
      UserPreference,
    ]),
    EmailModule,
    SmsModule,
  ],
  controllers: [EventsController, CalendarController],
  providers: [
    EventsService,
    AttendanceService,
    EventNotificationsService,
    CalendarService,
  ],
  exports: [EventsService, AttendanceService, EventNotificationsService],
})
export class EventsModule {}
