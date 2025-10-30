import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  TeamEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventAttendance,
  AttendanceStatus,
} from './calendar.types';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/teams';

  async getEventsForTeam(teamId: string, startDate?: Date, endDate?: Date): Promise<TeamEvent[]> {
    try {
      let url = `${this.apiUrl}/${teamId}/events`;
      
      if (startDate && endDate) {
        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        url += `?${params.toString()}`;
      }
      
      const events = await firstValueFrom(
        this.http.get<TeamEvent[]>(url)
      );
      
      // Convert date strings to Date objects
      return events.map(event => ({
        ...event,
        startDateTime: new Date(event.startDateTime),
        endDateTime: event.endDateTime ? new Date(event.endDateTime) : null,
        recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
        excludedDates: event.excludedDates?.map(d => new Date(d)) || [],
      }));
    } catch (error: any) {
      console.error('Error loading events:', error);
      throw new Error(error.error?.message || 'Failed to load events');
    }
  }

  async getEvent(teamId: string, eventId: string): Promise<TeamEvent> {
    try {
      const event = await firstValueFrom(
        this.http.get<TeamEvent>(`${this.apiUrl}/${teamId}/events/${eventId}`)
      );
      
      return {
        ...event,
        startDateTime: new Date(event.startDateTime),
        endDateTime: event.endDateTime ? new Date(event.endDateTime) : null,
        recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
        excludedDates: event.excludedDates?.map(d => new Date(d)) || [],
      };
    } catch (error: any) {
      console.error('Error loading event:', error);
      throw new Error(error.error?.message || 'Failed to load event');
    }
  }

  async createEvent(teamId: string, request: CreateEventRequest): Promise<TeamEvent> {
    try {
      const event = await firstValueFrom(
        this.http.post<TeamEvent>(`${this.apiUrl}/${teamId}/events`, request)
      );
      
      return {
        ...event,
        startDateTime: new Date(event.startDateTime),
        endDateTime: event.endDateTime ? new Date(event.endDateTime) : null,
        recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error(error.error?.message || 'Failed to create event');
    }
  }

  async updateEvent(teamId: string, eventId: string, request: UpdateEventRequest): Promise<TeamEvent> {
    try {
      const event = await firstValueFrom(
        this.http.patch<TeamEvent>(`${this.apiUrl}/${teamId}/events/${eventId}`, request)
      );
      
      return {
        ...event,
        startDateTime: new Date(event.startDateTime),
        endDateTime: event.endDateTime ? new Date(event.endDateTime) : null,
        recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate) : null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt)
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      throw new Error(error.error?.message || 'Failed to update event');
    }
  }

  async deleteEvent(teamId: string, eventId: string, occurrenceDate?: Date): Promise<void> {
    try {
      let url = `${this.apiUrl}/${teamId}/events/${eventId}`;
      
      if (occurrenceDate) {
        const params = new URLSearchParams({
          occurrenceDate: occurrenceDate.toISOString()
        });
        url += `?${params.toString()}`;
      }
      
      await firstValueFrom(
        this.http.delete<void>(url)
      );
    } catch (error: any) {
      console.error('Error deleting event:', error);
      throw new Error(error.error?.message || 'Failed to delete event');
    }
  }

  async getAttendanceForDateRange(
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EventAttendance[]> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const attendance = await firstValueFrom(
        this.http.get<EventAttendance[]>(
          `${this.apiUrl}/${teamId}/events/attendance/range?${params.toString()}`
        )
      );
      
      return attendance.map(a => ({
        ...a,
        instanceDate: new Date(a.instanceDate),
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt)
      }));
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      throw new Error(error.error?.message || 'Failed to load attendance');
    }
  }

  async updateAttendance(
    teamId: string,
    eventId: string,
    instanceDate: Date,
    attendance: AttendanceStatus
  ): Promise<EventAttendance> {
    try {
      const result = await firstValueFrom(
        this.http.patch<EventAttendance>(
          `${this.apiUrl}/${teamId}/events/${eventId}/attendance`,
          {
            eventId,
            instanceDate: instanceDate.toISOString().split('T')[0],
            attendance
          }
        )
      );
      
      return {
        ...result,
        instanceDate: new Date(result.instanceDate),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      };
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      throw new Error(error.error?.message || 'Failed to update attendance');
    }
  }

  async getEventInstanceAttendance(
    teamId: string,
    eventId: string,
    instanceDate: Date
  ): Promise<EventAttendance[]> {
    try {
      const formattedDate = instanceDate.toISOString().split('T')[0];
      const attendance = await firstValueFrom(
        this.http.get<EventAttendance[]>(
          `${this.apiUrl}/${teamId}/events/${eventId}/attendance/${formattedDate}`
        )
      );
      
      return attendance.map(a => ({
        ...a,
        instanceDate: new Date(a.instanceDate),
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt)
      }));
    } catch (error: any) {
      console.error('Error loading event attendance:', error);
      throw new Error(error.error?.message || 'Failed to load event attendance');
    }
  }

  cycleAttendance(current: AttendanceStatus | undefined): AttendanceStatus {
    switch (current) {
      case AttendanceStatus.YES:
        return AttendanceStatus.NOT_SURE;
      case AttendanceStatus.NOT_SURE:
        return AttendanceStatus.NO;
      case AttendanceStatus.NO:
      case undefined:
        return AttendanceStatus.YES;
      default:
        return AttendanceStatus.NOT_SURE;
    }
  }
}
