import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TeamEvent, CreateEventRequest, UpdateEventRequest } from './calendar.types';

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
        updatedAt: new Date(event.updatedAt)
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
        updatedAt: new Date(event.updatedAt)
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

  async deleteEvent(teamId: string, eventId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.apiUrl}/${teamId}/events/${eventId}`)
      );
    } catch (error: any) {
      console.error('Error deleting event:', error);
      throw new Error(error.error?.message || 'Failed to delete event');
    }
  }
}
