import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TeamEvent } from './entities/team-event.entity';
import { EventNotification } from './entities/event-notification.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { User } from '../users/entities/user.entity';
import {
  UserPreference,
  EventNotification as EventNotificationPref,
} from '../preferences/entities/user-preference.entity';
import { MembershipStatus } from '../teams/enums/membership-status.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class EventNotificationsService {
  private readonly logger = new Logger(EventNotificationsService.name);

  constructor(
    @InjectRepository(TeamEvent)
    private readonly eventRepository: Repository<TeamEvent>,
    @InjectRepository(EventNotification)
    private readonly notificationRepository: Repository<EventNotification>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    private readonly emailService: EmailService,
  ) {}

  // Run every 15 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndSendNotifications(): Promise<void> {
    this.logger.log('Starting event notification check...');

    try {
      // Get all upcoming events (within next 30 days)
      const now = new Date();

      const upcomingEvents = await this.eventRepository.find({
        where: {
          startDateTime: MoreThan(now),
        },
      });

      this.logger.log(`Found ${upcomingEvents.length} upcoming events`);

      for (const event of upcomingEvents) {
        await this.processEventNotifications(event);
      }

      this.logger.log('Event notification check completed');
    } catch (error) {
      this.logger.error('Error checking event notifications:', error);
    }
  }

  private async processEventNotifications(event: TeamEvent): Promise<void> {
    // Get all team members
    const teamMembers = await this.userTeamRepository.find({
      where: { teamId: event.teamId, status: MembershipStatus.ACTIVE },
      relations: ['user'],
    });

    for (const member of teamMembers) {
      if (!member.user) continue;

      // Check if user should see this event based on visibility
      const canSeeEvent = await this.checkEventVisibility(event);
      if (!canSeeEvent) continue;

      // Get user's notification preferences
      const preference = await this.preferenceRepository.findOne({
        where: { userId: member.userId },
      });

      // Default: 1 day before, email notification
      const defaultPreferences: EventNotificationPref[] = [
        {
          timeBefore: 24 * 60, // 1 day in minutes
          method: 'email',
        },
      ];

      const notificationPrefs: EventNotificationPref[] =
        preference &&
        preference.eventNotifications &&
        preference.eventNotifications.length > 0
          ? preference.eventNotifications
          : defaultPreferences;

      // Check each preference
      for (const pref of notificationPrefs) {
        await this.checkAndSendNotification(
          event,
          member.user,
          pref.timeBefore,
          pref.method,
        );
      }
    }
  }

  private async checkEventVisibility(event: TeamEvent): Promise<boolean> {
    // If no user group specified, event is visible to all team members
    if (!event.userGroupId) {
      return true;
    }

    // TODO: Implement user group visibility check
    // For now, return true (visible to all)
    return true;
  }

  private async checkAndSendNotification(
    event: TeamEvent,
    user: User,
    minutesBefore: number,
    notificationType: 'email' | 'text',
  ): Promise<void> {
    const now = new Date();
    const eventTime = new Date(event.startDateTime);
    const notificationTime = new Date(
      eventTime.getTime() - minutesBefore * 60 * 1000,
    );

    // Check if notification time has passed and event hasn't started yet
    if (notificationTime > now || eventTime < now) {
      return;
    }

    // Check if notification already sent
    const existingNotification = await this.notificationRepository.findOne({
      where: {
        eventId: event.id,
        userId: user.id,
        notificationTime: notificationTime,
      },
    });

    if (existingNotification) {
      return; // Already sent
    }

    // Send notification
    try {
      if (notificationType === 'email') {
        await this.sendEmailNotification(event, user, minutesBefore);
      } else {
        await this.sendTextNotification(event, user, minutesBefore);
      }

      // Record that notification was sent
      const notification = this.notificationRepository.create({
        eventId: event.id,
        userId: user.id,
        notificationTime: notificationTime,
        sentAt: now,
        notificationType: notificationType,
      });

      await this.notificationRepository.save(notification);

      this.logger.log(
        `Sent ${notificationType} notification to ${user.primaryEmail} for event "${event.name}"`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending notification to ${user.primaryEmail}:`,
        error,
      );
    }
  }

  private async sendEmailNotification(
    event: TeamEvent,
    user: User,
    minutesBefore: number,
  ): Promise<void> {
    const timeDescription = this.formatTimeDescription(minutesBefore);
    const eventDate = new Date(event.startDateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const subject = `Reminder: ${event.name} ${timeDescription}`;
    const htmlContent = `
      <h2>Event Reminder</h2>
      <p>Hello ${user.firstName},</p>
      <p>This is a reminder that the following event is coming up ${timeDescription}:</p>
      <div style="border-left: 4px solid #667eea; padding-left: 16px; margin: 20px 0;">
        <h3>${event.name}</h3>
        <p><strong>Date/Time:</strong> ${eventDate}</p>
        ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
        ${event.description ? `<p><strong>Description:</strong><br>${event.description}</p>` : ''}
      </div>
      <p style="color: #6b7280; font-size: 0.9em;">This is an automated notification from your team calendar.</p>
    `;

    await this.emailService.sendEventNotificationEmail(
      user.primaryEmail,
      subject,
      htmlContent,
    );
  }

  private async sendTextNotification(
    event: TeamEvent,
    user: User,
    minutesBefore: number,
  ): Promise<void> {
    const timeDescription = this.formatTimeDescription(minutesBefore);
    const eventDate = new Date(event.startDateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    // For now, just log to console as text backend will be added later
    const message = `Reminder: ${event.name} on ${eventDate}${event.location ? ` at ${event.location}` : ''}`;

    this.logger.log(
      `[TEXT NOTIFICATION] Would send to ${user.primaryEmail}: ${message} (${timeDescription})`,
    );
  }

  private formatTimeDescription(minutesBefore: number): string {
    if (minutesBefore < 60) {
      return `in ${minutesBefore} minute${minutesBefore !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutesBefore / 60);
    if (hours < 24) {
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(hours / 24);
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  }
}
