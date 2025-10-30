import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Get ICS calendar feed for a team
   *
   * This endpoint serves an ICS (iCalendar) feed that can be subscribed to
   * in calendar applications like Google Calendar, Apple Calendar, Outlook, etc.
   *
   * To subscribe:
   * - Replace http:// with webcal:// in the URL
   * - Example: webcal://yourdomain.com/api/calendar/{teamNumber}
   *
   * The feed includes all events for the team with proper timezone handling,
   * recurrence rules, and exclusions for deleted occurrences.
   */
  @Get(':teamNumber')
  async getTeamCalendar(@Param('teamNumber') teamNumber: string, @Res() res: Response): Promise<void> {
    try {
      const icsContent = await this.calendarService.generateTeamCalendarFeed(teamNumber);

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="team-${teamNumber}-calendar.ics"`);
      res.send(icsContent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).send('Team not found');
      } else {
        res.status(500).send('Error generating calendar');
      }
    }
  }
}
