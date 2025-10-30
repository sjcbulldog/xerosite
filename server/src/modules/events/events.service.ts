import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TeamEvent } from './entities/team-event.entity';
import { EventExclusion } from './entities/event-exclusion.entity';
import { CreateEventDto, UpdateEventDto, EventResponseDto } from './dto/event.dto';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { UserTeam } from '../teams/entities/user-team.entity';
import { UserGroup } from '../teams/entities/user-group.entity';
import { MembershipStatus } from '../teams/enums/membership-status.enum';
import { EmailService } from '../email/email.service';
import { generateICS } from './utils/ics-generator';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(TeamEvent)
    private readonly eventRepository: Repository<TeamEvent>,
    @InjectRepository(EventExclusion)
    private readonly eventExclusionRepository: Repository<EventExclusion>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTeam)
    private readonly userTeamRepository: Repository<UserTeam>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    private readonly emailService: EmailService,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string): Promise<EventResponseDto> {
    console.log('[EventCreate] Creating new event:', createEventDto.name);
    
    const event = this.eventRepository.create({
      ...createEventDto,
      startDateTime: new Date(createEventDto.startDateTime),
      endDateTime: createEventDto.endDateTime ? new Date(createEventDto.endDateTime) : null,
      recurrenceEndDate: createEventDto.recurrenceEndDate
        ? new Date(createEventDto.recurrenceEndDate)
        : null,
      createdBy: userId,
    });

    const savedEvent = await this.eventRepository.save(event);
    console.log('[EventCreate] Event saved:', savedEvent.id);

    // Send email notifications to attendees asynchronously but don't block response
    setImmediate(() => {
      this.sendEventNotifications(savedEvent, userId).catch((error) => {
        console.error('[EventCreate] Error sending event notifications:', error);
      });
    });

    return this.transformToResponse(savedEvent);
  }

  async findAllForTeam(teamId: string): Promise<EventResponseDto[]> {
    const events = await this.eventRepository.find({
      where: { teamId },
      order: { startDateTime: 'ASC' },
    });

    return Promise.all(events.map((event) => this.transformToResponse(event)));
  }

  async findByDateRange(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EventResponseDto[]> {
    const events = await this.eventRepository.find({
      where: {
        teamId,
        startDateTime: Between(startDate, endDate),
      },
      order: { startDateTime: 'ASC' },
    });

    return Promise.all(events.map((event) => this.transformToResponse(event)));
  }

  async findOne(id: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return this.transformToResponse(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Update fields
    if (updateEventDto.name !== undefined) event.name = updateEventDto.name;
    if (updateEventDto.description !== undefined) event.description = updateEventDto.description;
    if (updateEventDto.location !== undefined) event.location = updateEventDto.location;
    if (updateEventDto.startDateTime !== undefined) event.startDateTime = new Date(updateEventDto.startDateTime);
    if (updateEventDto.endDateTime !== undefined) event.endDateTime = updateEventDto.endDateTime ? new Date(updateEventDto.endDateTime) : null;
    if (updateEventDto.recurrenceType !== undefined) event.recurrenceType = updateEventDto.recurrenceType;
    if (updateEventDto.recurrencePattern !== undefined) event.recurrencePattern = updateEventDto.recurrencePattern;
    if (updateEventDto.recurrenceEndDate !== undefined) event.recurrenceEndDate = updateEventDto.recurrenceEndDate ? new Date(updateEventDto.recurrenceEndDate) : null;
    if (updateEventDto.userGroupId !== undefined) event.userGroupId = updateEventDto.userGroupId;

    const updatedEvent = await this.eventRepository.save(event);
    return this.transformToResponse(updatedEvent);
  }

  async remove(id: string, deletedByUserId?: string, occurrenceDate?: Date): Promise<void> {
    console.log('[EventDelete] Deleting event:', {
      id,
      occurrenceDate,
      occurrenceDateType: typeof occurrenceDate,
      occurrenceDateValue: occurrenceDate ? occurrenceDate.toISOString() : null,
      deletedByUserId,
    });
    
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    console.log('[EventDelete] Event found:', {
      eventId: event.id,
      recurrenceType: event.recurrenceType,
      isRecurring: event.recurrenceType !== 'none',
    });

    // If occurrenceDate is provided and event is recurring, exclude the specific occurrence
    if (occurrenceDate && event.recurrenceType !== 'none') {
      console.log('[EventDelete] Excluding single occurrence for recurring event');
      
      // Normalize the date to midnight UTC to match how dates are stored
      const normalizedDate = new Date(occurrenceDate);
      normalizedDate.setUTCHours(0, 0, 0, 0);
      
      console.log('[EventDelete] Normalized date:', {
        original: occurrenceDate.toISOString(),
        normalized: normalizedDate.toISOString(),
      });
      
      // Create an exclusion record
      const exclusion = this.eventExclusionRepository.create({
        eventId: id,
        excludedDate: normalizedDate,
      });
      
      await this.eventExclusionRepository.save(exclusion);
      console.log('[EventDelete] Occurrence excluded:', normalizedDate);

      // Send cancellation notification for single occurrence
      if (deletedByUserId) {
        console.log('[EventDelete] Sending single occurrence cancellation notifications');
        setImmediate(() => {
          this.sendSingleOccurrenceCancellationNotifications(event, deletedByUserId, occurrenceDate).catch((error) => {
            console.error('[EventDelete] Error sending single occurrence cancellation notifications:', error);
          });
        });
      }
      
      return;
    }

    // Otherwise, delete the entire event series
    console.log('[EventDelete] Deleting entire event series');
    
    // Create a copy of the event for notifications (before it's removed from DB)
    const eventCopy = { ...event };

    // Delete the event (this will cascade delete exclusions due to CASCADE setting)
    await this.eventRepository.remove(event);
    console.log('[EventDelete] Event deleted:', id);

    // Send cancellation notifications after deleting
    if (deletedByUserId) {
      console.log('[EventDelete] Sending series cancellation notifications');
      setImmediate(() => {
        this.sendCancellationNotifications(eventCopy as TeamEvent, deletedByUserId).catch((error) => {
          console.error('[EventDelete] Error sending cancellation notifications:', error);
        });
      });
    }
  }

  private async transformToResponse(event: TeamEvent): Promise<EventResponseDto> {
    // Load exclusions for this event
    const exclusions = await this.eventExclusionRepository.find({
      where: { eventId: event.id },
      order: { excludedDate: 'ASC' },
    });

    return {
      id: event.id,
      teamId: event.teamId,
      name: event.name,
      description: event.description,
      location: event.location,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      recurrenceType: event.recurrenceType,
      recurrencePattern: event.recurrencePattern,
      recurrenceEndDate: event.recurrenceEndDate,
      userGroupId: event.userGroupId,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      excludedDates: exclusions.map(e => e.excludedDate),
    };
  }

  private async sendEventNotifications(event: TeamEvent, creatorId: string): Promise<void> {
    try {
      console.log('[EventNotifications] Starting to send notifications for event:', event.id);
      
      // Get team info
      const team = await this.teamRepository.findOne({
        where: { id: event.teamId },
      });

      if (!team) {
        console.log('[EventNotifications] Team not found:', event.teamId);
        return;
      }

      // Get creator info
      const creator = await this.userRepository.findOne({
        where: { id: creatorId },
      });

      if (!creator) {
        console.log('[EventNotifications] Creator not found:', creatorId);
        return;
      }

      // Get attendees based on user group or all team members
      const attendees = await this.getEventAttendees(event);
      console.log('[EventNotifications] Found attendees:', attendees.length);

      // Send emails to all attendees
      const emailPromises = attendees.map((attendee) => {
        const recipientEmail = attendee.primaryEmail || attendee.emails?.[0]?.email;
        if (!recipientEmail) {
          console.log('[EventNotifications] No email for user:', attendee.id);
          return Promise.resolve();
        }

        console.log('[EventNotifications] Sending email to:', recipientEmail);
        
        // Generate ICS attachment with sequence 0 for new events
        const icsContent = generateICS(event, 'REQUEST', 0);
        const icsBase64 = Buffer.from(icsContent).toString('base64');

        return this.emailService.sendEmailWithAttachments({
          to: recipientEmail,
          subject: `[${team.name}] New Event: ${event.name}`,
          html: this.generateEventEmailContent(event, team, creator),
          attachments: [
            {
              filename: 'event.ics',
              content: icsBase64,
              contentType: 'text/calendar',
            },
          ],
        });
      });

      await Promise.all(emailPromises);
      console.log('[EventNotifications] All notification emails sent successfully');
    } catch (error) {
      console.error('Error sending event notifications:', error);
      throw error;
    }
  }

  private async sendCancellationNotifications(event: TeamEvent, deletedByUserId: string): Promise<void> {
    try {
      console.log('[EventCancellation] Starting to send cancellation notifications for event:', event.id);
      
      // Get team info
      const team = await this.teamRepository.findOne({
        where: { id: event.teamId },
      });

      if (!team) {
        console.log('[EventCancellation] Team not found:', event.teamId);
        return;
      }

      // Get deleter info
      const deleter = await this.userRepository.findOne({
        where: { id: deletedByUserId },
      });

      if (!deleter) {
        console.log('[EventCancellation] Deleter not found:', deletedByUserId);
        return;
      }

      // Get attendees based on user group or all team members
      const attendees = await this.getEventAttendees(event);
      console.log('[EventCancellation] Found attendees:', attendees.length);

      // Send cancellation emails to all attendees
      const emailPromises = attendees.map((attendee) => {
        const recipientEmail = attendee.primaryEmail || attendee.emails?.[0]?.email;
        if (!recipientEmail) {
          console.log('[EventCancellation] No email for user:', attendee.id);
          return Promise.resolve();
        }

        console.log('[EventCancellation] Sending cancellation email to:', recipientEmail);
        
        // Generate ICS cancellation attachment with sequence 1 (higher than the original event's sequence 0)
        const icsContent = generateICS(event, 'CANCEL', 1);
        const icsBase64 = Buffer.from(icsContent).toString('base64');

        return this.emailService.sendEmailWithAttachments({
          to: recipientEmail,
          subject: `[${team.name}] Event Canceled: ${event.name}`,
          html: this.generateCancellationEmailContent(event, team, deleter),
          attachments: [
            {
              filename: 'event.ics',
              content: icsBase64,
              contentType: 'text/calendar',
            },
          ],
        });
      });

      await Promise.all(emailPromises);
      console.log('[EventCancellation] All cancellation emails sent successfully');
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
      throw error;
    }
  }

  private async sendSingleOccurrenceCancellationNotifications(
    event: TeamEvent,
    deletedByUserId: string,
    occurrenceDate: Date,
  ): Promise<void> {
    try {
      console.log('[OccurrenceCancellation] Starting to send cancellation notifications for occurrence:', occurrenceDate);
      
      // Get team info
      const team = await this.teamRepository.findOne({
        where: { id: event.teamId },
      });

      if (!team) {
        console.log('[OccurrenceCancellation] Team not found:', event.teamId);
        return;
      }

      // Get deleter info
      const deleter = await this.userRepository.findOne({
        where: { id: deletedByUserId },
      });

      if (!deleter) {
        console.log('[OccurrenceCancellation] Deleter not found:', deletedByUserId);
        return;
      }

      // Get attendees based on user group or all team members
      const attendees = await this.getEventAttendees(event);
      console.log('[OccurrenceCancellation] Found attendees:', attendees.length);

      // Create a modified event object for this occurrence
      const occurrenceEvent = {
        ...event,
        startDateTime: occurrenceDate,
      };

      // Send cancellation emails to all attendees
      const emailPromises = attendees.map((attendee) => {
        const recipientEmail = attendee.primaryEmail || attendee.emails?.[0]?.email;
        if (!recipientEmail) {
          console.log('[OccurrenceCancellation] No email for user:', attendee.id);
          return Promise.resolve();
        }

        console.log('[OccurrenceCancellation] Sending cancellation email to:', recipientEmail);
        
        // Generate ICS cancellation attachment for single occurrence with RECURRENCE-ID
        const icsContent = generateICS(occurrenceEvent as TeamEvent, 'CANCEL', 1);
        const icsBase64 = Buffer.from(icsContent).toString('base64');

        return this.emailService.sendEmailWithAttachments({
          to: recipientEmail,
          subject: `[${team.name}] Event Occurrence Canceled: ${event.name}`,
          html: this.generateOccurrenceCancellationEmailContent(event, team, deleter, occurrenceDate),
          attachments: [
            {
              filename: 'event.ics',
              content: icsBase64,
              contentType: 'text/calendar',
            },
          ],
        });
      });

      await Promise.all(emailPromises);
      console.log('[OccurrenceCancellation] All cancellation emails sent successfully');
    } catch (error) {
      console.error('Error sending single occurrence cancellation notifications:', error);
      throw error;
    }
  }

  private async getEventAttendees(event: TeamEvent): Promise<User[]> {
    if (event.userGroupId) {
      // Get users from specific user group
      return this.getUserGroupMembers(event.userGroupId, event.teamId);
    } else {
      // Get all active team members
      return this.getAllTeamMembers(event.teamId);
    }
  }

  private async getAllTeamMembers(teamId: string): Promise<User[]> {
    console.log('[getAllTeamMembers] Loading team members for team:', teamId);
    
    const userTeams = await this.userTeamRepository.find({
      where: {
        teamId,
        status: 'active' as any,
      },
      relations: ['user', 'user.emails'],
    });

    console.log('[getAllTeamMembers] Found userTeams:', userTeams.length);
    
    const users = userTeams.filter((ut) => ut.user && ut.user.isActive).map((ut) => ut.user);
    
    console.log('[getAllTeamMembers] Active users:', users.length);
    users.forEach((user, idx) => {
      console.log(`[getAllTeamMembers] User ${idx + 1}:`, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        emailsCount: user.emails?.length || 0,
        primaryEmail: user.primaryEmail,
      });
    });
    
    return users;
  }

  private async getUserGroupMembers(userGroupId: string, teamId: string): Promise<User[]> {
    const userGroup = await this.userGroupRepository.findOne({
      where: { id: userGroupId, teamId },
    });

    if (!userGroup) {
      return [];
    }

    // For now, return all team members
    // In a full implementation, evaluate the user group's visibility rules
    return this.getAllTeamMembers(teamId);
  }

  private generateEventEmailContent(
    event: TeamEvent,
    team: Team,
    creator: User,
  ): string {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    };

    const startDate = formatDate(event.startDateTime);
    const endDate = event.endDateTime ? formatDate(event.endDateTime) : null;
    const recurrenceInfo = event.recurrenceType !== 'none' ? `<p><strong>Recurrence:</strong> ${event.recurrenceType}</p>` : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4CAF50; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">New Event Scheduled</h2>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="color: #333; margin: 0 0 20px 0;">${event.name}</h3>
          
          <div style="margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Team:</strong> ${team.name}</p>
            <p style="margin: 5px 0;"><strong>Starts:</strong> ${startDate}</p>
            ${endDate ? `<p style="margin: 5px 0;"><strong>Ends:</strong> ${endDate}</p>` : ''}
            ${event.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ''}
            ${recurrenceInfo}
          </div>
          
          ${
            event.description
              ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #333;">Description:</p>
              <p style="margin: 0; color: #666; line-height: 1.6;">
                ${event.description.replace(/\n/g, '<br>')}
              </p>
            </div>
          `
              : ''
          }
          
          <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 0.9em;">
              Scheduled by ${creator.firstName} ${creator.lastName}
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 0.9em; margin: 0;">
            This event notification was sent via the ${team.name} team calendar system.
          </p>
        </div>
      </div>
    `;
  }

  private generateCancellationEmailContent(
    event: TeamEvent,
    team: Team,
    deleter: User,
  ): string {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    };

    const startDate = formatDate(event.startDateTime);
    const endDate = event.endDateTime ? formatDate(event.endDateTime) : null;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f44336; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Event Canceled</h2>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="color: #333; margin: 0 0 20px 0;">${event.name}</h3>
          
          <div style="margin-bottom: 15px; padding: 15px; background: #ffebee; border-left: 4px solid #f44336; border-radius: 4px;">
            <p style="margin: 0; color: #c62828; font-weight: 600;">
              This event has been canceled.
            </p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Team:</strong> ${team.name}</p>
            <p style="margin: 5px 0;"><strong>Was scheduled for:</strong> ${startDate}</p>
            ${endDate ? `<p style="margin: 5px 0;"><strong>Until:</strong> ${endDate}</p>` : ''}
            ${event.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ''}
          </div>
          
          ${
            event.description
              ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #333;">Description:</p>
              <p style="margin: 0; color: #666; line-height: 1.6;">
                ${event.description.replace(/\n/g, '<br>')}
              </p>
            </div>
          `
              : ''
          }
          
          <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 0.9em;">
              Canceled by ${deleter.firstName} ${deleter.lastName}
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 0.9em; margin: 0;">
            This cancellation notification was sent via the ${team.name} team calendar system.
          </p>
        </div>
      </div>
    `;
  }

  private generateOccurrenceCancellationEmailContent(
    event: TeamEvent,
    team: Team,
    deleter: User,
    occurrenceDate: Date,
  ): string {
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    };

    const occurrenceFormatted = formatDate(occurrenceDate);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ff9800; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Event Occurrence Canceled</h2>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h3 style="color: #333; margin: 0 0 20px 0;">${event.name}</h3>
          
          <div style="margin-bottom: 15px; padding: 15px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
            <p style="margin: 0; color: #e65100; font-weight: 600;">
              The occurrence on ${occurrenceFormatted} has been canceled.
            </p>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 0.9em;">
              Other occurrences of this recurring event are not affected.
            </p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>Team:</strong> ${team.name}</p>
            <p style="margin: 5px 0;"><strong>Canceled occurrence:</strong> ${occurrenceFormatted}</p>
            ${event.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>` : ''}
          </div>
          
          ${
            event.description
              ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; font-weight: 600; color: #333;">Description:</p>
              <p style="margin: 0; color: #666; line-height: 1.6;">
                ${event.description.replace(/\n/g, '<br>')}
              </p>
            </div>
          `
              : ''
          }
          
          <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 0.9em;">
              Canceled by ${deleter.firstName} ${deleter.lastName}
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center;">
          <p style="color: #666; font-size: 0.9em; margin: 0;">
            This cancellation notification was sent via the ${team.name} team calendar system.
          </p>
        </div>
      </div>
    `;
  }
}
