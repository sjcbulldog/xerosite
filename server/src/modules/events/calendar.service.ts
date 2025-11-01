import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamEvent } from './entities/team-event.entity';
import { Team } from '../teams/entities/team.entity';
import { EventExclusion } from './entities/event-exclusion.entity';
import { formatInTimezone } from './utils/timezone.utils';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(TeamEvent)
    private readonly eventRepository: Repository<TeamEvent>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(EventExclusion)
    private readonly eventExclusionRepository: Repository<EventExclusion>,
  ) {}

  async generateTeamCalendarFeed(teamNumber: string): Promise<string> {
    // Fetch team by team number
    const team = await this.teamRepository.findOne({
      where: { teamNumber: parseInt(teamNumber, 10) },
    });

    if (!team) {
      throw new NotFoundException(`Team with number ${teamNumber} not found`);
    }

    const timezone = team.timezone || 'America/New_York';

    // Fetch all events for the team
    const events = await this.eventRepository.find({
      where: { teamId: team.id },
    });

    // Fetch all exclusions for these events
    const eventIds = events.map((e) => e.id);
    const exclusions =
      eventIds.length > 0
        ? await this.eventExclusionRepository.find({
            where: eventIds.map((id) => ({ eventId: id })),
          })
        : [];

    // Create a map of event ID to exclusions
    const exclusionMap = new Map<string, EventExclusion[]>();
    for (const exclusion of exclusions) {
      if (!exclusionMap.has(exclusion.eventId)) {
        exclusionMap.set(exclusion.eventId, []);
      }
      exclusionMap.get(exclusion.eventId)!.push(exclusion);
    }

    // Generate ICS content
    const icsLines: string[] = [];

    // Calendar header
    icsLines.push('BEGIN:VCALENDAR');
    icsLines.push('VERSION:2.0');
    icsLines.push('PRODID:-//Xerosite//Team Calendar//EN');
    icsLines.push('CALSCALE:GREGORIAN');
    icsLines.push('METHOD:PUBLISH');
    icsLines.push(`X-WR-CALNAME:${this.escapeText(team.name)} Calendar`);
    icsLines.push(`X-WR-TIMEZONE:${timezone}`);
    icsLines.push(`X-WR-CALDESC:Calendar for team ${this.escapeText(team.name)}`);

    // Add each event
    for (const event of events) {
      const eventExclusions = exclusionMap.get(event.id) || [];
      icsLines.push(...this.generateEventLines(event, eventExclusions, timezone));
    }

    // Calendar footer
    icsLines.push('END:VCALENDAR');

    return icsLines.join('\r\n');
  }

  private generateEventLines(
    event: TeamEvent,
    exclusions: EventExclusion[],
    timezone: string,
  ): string[] {
    const lines: string[] = [];

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@xerosite.com`);
    lines.push(`DTSTAMP:${this.formatICSDateTime(new Date())}`);

    // Convert start time to team timezone
    const startParts = this.formatDateTimeInTimezone(event.startDateTime, timezone);
    lines.push(`DTSTART:${startParts}`);

    // End time
    if (event.endDateTime) {
      const endParts = this.formatDateTimeInTimezone(event.endDateTime, timezone);
      lines.push(`DTEND:${endParts}`);
    }

    // Event details
    lines.push(`SUMMARY:${this.escapeText(event.name)}`);

    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${this.escapeText(event.location)}`);
    }

    // Handle recurrence
    if (event.recurrenceType && event.recurrenceType !== 'none') {
      const rrule = this.generateRRule(event);
      if (rrule) {
        lines.push(`RRULE:${rrule}`);
      }

      // Add exclusion dates
      if (exclusions && exclusions.length > 0) {
        const exdates = exclusions
          .map((exclusion) => {
            const exDateParts = this.formatDateTimeInTimezone(exclusion.excludedDate, timezone);
            return exDateParts;
          })
          .join(',');

        if (exdates) {
          lines.push(`EXDATE:${exdates}`);
        }
      }
    }

    lines.push('END:VEVENT');

    return lines;
  }

  private formatDateTimeInTimezone(date: Date, timezone: string): string {
    // Format date/time in the team's timezone as floating time (no timezone indicator)
    const isoString = formatInTimezone(date, timezone);

    // Extract components from ISO string (format: YYYY-MM-DDTHH:mm:ss.sssZ)
    const match = isoString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (!match) {
      throw new Error(`Failed to parse date: ${isoString}`);
    }

    const [, year, month, day, hour, minute, second] = match;

    // Return in ICS format: YYYYMMDDTHHMMSS (floating time)
    return `${year}${month}${day}T${hour}${minute}${second}`;
  }

  private formatICSDateTime(date: Date): string {
    // Format as UTC timestamp for DTSTAMP
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    const second = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hour}${minute}${second}Z`;
  }

  private generateRRule(event: TeamEvent): string | null {
    const parts: string[] = [];

    switch (event.recurrenceType) {
      case 'daily':
        parts.push('FREQ=DAILY');
        if (event.recurrencePattern?.interval) {
          parts.push(`INTERVAL=${event.recurrencePattern.interval}`);
        }
        break;

      case 'weekly':
        parts.push('FREQ=WEEKLY');
        if (event.recurrencePattern?.daysOfWeek && event.recurrencePattern.daysOfWeek.length > 0) {
          const days = event.recurrencePattern.daysOfWeek
            .map((day) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][day])
            .join(',');
          parts.push(`BYDAY=${days}`);
        }
        break;

      case 'monthly':
        parts.push('FREQ=MONTHLY');
        if (
          event.recurrencePattern?.daysOfMonth &&
          event.recurrencePattern.daysOfMonth.length > 0
        ) {
          parts.push(`BYMONTHDAY=${event.recurrencePattern.daysOfMonth.join(',')}`);
        }
        break;

      default:
        return null;
    }

    // Add end date if present
    if (event.recurrenceEndDate) {
      const endDateStr = this.formatICSDateTime(event.recurrenceEndDate);
      parts.push(`UNTIL=${endDateStr}`);
    }

    return parts.join(';');
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
