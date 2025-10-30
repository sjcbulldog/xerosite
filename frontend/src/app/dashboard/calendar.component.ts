import { Component, inject, signal, computed, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from './calendar.service';
import {
  TeamEvent,
  CreateEventRequest,
  UpdateEventRequest,
  RecurrenceType,
  VisibilityType,
  RecurrencePattern,
  VisibilityRules,
  AttendanceStatus,
  EventAttendance,
  CalendarEventInstance,
} from './calendar.types';
import { AuthService } from '../auth/auth.service';
import { TeamMember } from './teams.service';
import { UserGroupsService, UserGroup } from './user-groups.service';
import { Subteam } from './subteam.types';
import { VisibilitySelectorComponent } from './visibility-selector.component';
import { VisibilityRuleSet } from './visibility-selector.types';

type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventInstance[];
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, DatePipe, FormsModule, VisibilitySelectorComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements OnInit {
  private readonly calendarService = inject(CalendarService);
  private readonly userGroupsService = inject(UserGroupsService);
  protected readonly authService = inject(AuthService);
  
  readonly teamId = input.required<string>();
  readonly teamRoles = input.required<string[]>();
  readonly isAdmin = input.required<boolean>();
  readonly members = input.required<TeamMember[]>();
  readonly subteams = input.required<Subteam[]>();
  
  protected readonly currentView = signal<CalendarView>('month');
  protected readonly currentDate = signal(new Date());
  protected readonly events = signal<TeamEvent[]>([]);
  protected readonly attendance = signal<EventAttendance[]>([]);
  protected readonly isLoadingEvents = signal(false);
  
  // Computed permission check
  protected readonly canScheduleEvents = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    const member = this.members().find(m => m.userId === currentUser.id);
    if (!member) return false;

    // Administrators always have permission to schedule events
    if (member.roles.includes('Administrator')) return true;

    // Check if user has SCHEDULE_EVENTS permission
    const permission = member.permissions?.find(p => p.permission === 'SCHEDULE_EVENTS');
    return permission?.enabled ?? false;
  });

  protected readonly canDeleteEvents = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    const member = this.members().find(m => m.userId === currentUser.id);
    if (!member) return false;

    // Administrators always have permission to delete events
    if (member.roles.includes('Administrator')) return true;

    // Check if user has DELETE_EVENTS permission (or use SCHEDULE_EVENTS for now)
    const permission = member.permissions?.find(p => p.permission === 'SCHEDULE_EVENTS');
    return permission?.enabled ?? false;
  });
  
  // Dialog signals
  protected readonly showEventDialog = signal(false);
  protected readonly showVisibilitySelector = signal(false);
  protected readonly selectedEvent = signal<TeamEvent | null>(null);
  protected readonly eventName = signal('');
  protected readonly eventDescription = signal('');
  protected readonly eventLocation = signal('');
  protected readonly eventStartDate = signal('');
  protected readonly eventStartTime = signal('');
  protected readonly eventEndDate = signal('');
  protected readonly eventEndTime = signal('');
  protected readonly recurrenceType = signal<RecurrenceType>(RecurrenceType.NONE);
  protected readonly selectedUserGroupId = signal<string | null>(null);
  protected readonly isSavingEvent = signal(false);
  protected readonly eventError = signal<string | null>(null);
  
  // Visibility selector signal
  protected readonly visibilityRuleSet = signal<VisibilityRuleSet | null>(null);
  
  // Recurrence pattern signals
  protected readonly dailyInterval = signal(1);
  protected readonly weeklyDays = signal<boolean[]>([false, false, false, false, false, false, false]); // Sun-Sat
  protected readonly monthlyDays = signal<number[]>([]);
  protected readonly monthlyPattern = signal('');
  protected readonly recurrenceEndDate = signal('');
  
  // User groups
  protected readonly userGroups = signal<UserGroup[]>([]);
  
  // Computed properties
  protected readonly monthName = computed(() => {
    const date = this.currentDate();
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  });
  
  protected readonly calendarDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add previous month days
    const prevMonthDays = firstDayOfWeek;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: dayDate.getTime() === today.getTime(),
        events: this.getEventsForDate(dayDate)
      });
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday: dayDate.getTime() === today.getTime(),
        events: this.getEventsForDate(dayDate)
      });
    }
    
    // Add next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const dayDate = new Date(year, month + 1, day);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: dayDate.getTime() === today.getTime(),
        events: this.getEventsForDate(dayDate)
      });
    }
    
    return days;
  });
  
  protected readonly filteredEvents = computed(() => {
    const view = this.currentView();
    const date = this.currentDate();
    
    if (view === 'day') {
      return this.getEventsForDate(date);
    } else if (view === 'week') {
      return this.getEventsForWeek(date);
    } else if (view === 'month') {
      return this.getEventsForMonth(date);
    } else {
      return this.getEventsForYear(date);
    }
  });
  
  readonly RecurrenceType = RecurrenceType;
  readonly VisibilityType = VisibilityType;
  
  async ngOnInit(): Promise<void> {
    await this.loadEvents();
    await this.loadUserGroups();
  }

  protected async loadUserGroups(): Promise<void> {
    try {
      const groups = await this.userGroupsService.getUserGroups(this.teamId());
      this.userGroups.set(groups);
    } catch (error) {
      console.error('Failed to load user groups:', error);
    }
  }
  
  protected async loadEvents(): Promise<void> {
    this.isLoadingEvents.set(true);
    try {
      const events = await this.calendarService.getEventsForTeam(this.teamId());
      this.events.set(events);
      
      // Load attendance for visible date range
      await this.loadAttendance();
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      this.isLoadingEvents.set(false);
    }
  }

  protected async loadAttendance(): Promise<void> {
    try {
      const view = this.currentView();
      const date = this.currentDate();
      let startDate: Date;
      let endDate: Date;

      if (view === 'day') {
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      } else if (view === 'week') {
        startDate = new Date(date);
        startDate.setDate(date.getDate() - date.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (view === 'month') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      } else {
        // Year view
        startDate = new Date(date.getFullYear(), 0, 1);
        endDate = new Date(date.getFullYear(), 11, 31);
      }

      const attendance = await this.calendarService.getAttendanceForDateRange(
        this.teamId(),
        startDate,
        endDate
      );
      this.attendance.set(attendance);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  }
  
  protected changeView(view: CalendarView): void {
    this.currentView.set(view);
    // Reload attendance for new view range
    this.loadAttendance();
  }
  
  protected previousPeriod(): void {
    const view = this.currentView();
    const current = this.currentDate();
    let newDate: Date;
    
    if (view === 'day') {
      newDate = new Date(current);
      newDate.setDate(current.getDate() - 1);
    } else if (view === 'week') {
      newDate = new Date(current);
      newDate.setDate(current.getDate() - 7);
    } else if (view === 'month') {
      newDate = new Date(current);
      newDate.setMonth(current.getMonth() - 1);
    } else {
      newDate = new Date(current);
      newDate.setFullYear(current.getFullYear() - 1);
    }
    
    this.currentDate.set(newDate);
  }
  
  protected nextPeriod(): void {
    const view = this.currentView();
    const current = this.currentDate();
    let newDate: Date;
    
    if (view === 'day') {
      newDate = new Date(current);
      newDate.setDate(current.getDate() + 1);
    } else if (view === 'week') {
      newDate = new Date(current);
      newDate.setDate(current.getDate() + 7);
    } else if (view === 'month') {
      newDate = new Date(current);
      newDate.setMonth(current.getMonth() + 1);
    } else {
      newDate = new Date(current);
      newDate.setFullYear(current.getFullYear() + 1);
    }
    
    this.currentDate.set(newDate);
  }
  
  protected today(): void {
    this.currentDate.set(new Date());
  }
  
  protected openCreateEventDialog(date?: Date): void {
    this.resetEventForm();
    if (date) {
      // Pre-fill the date if provided
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.eventStartDate.set(`${year}-${month}-${day}`);
    }
    this.selectedEvent.set(null);
    this.showEventDialog.set(true);
  }
  
  protected onDayDoubleClick(day: CalendarDay): void {
    if (this.canScheduleEvents()) {
      this.openCreateEventDialog(day.date);
    }
  }
  
  protected openEditEventDialog(event: TeamEvent): void {
    this.selectedEvent.set(event);
    this.eventName.set(event.name);
    this.eventDescription.set(event.description || '');
    this.eventLocation.set(event.location || '');
    
    const startDate = new Date(event.startDateTime);
    // Format date in local timezone to avoid timezone shift
    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    this.eventStartDate.set(`${startYear}-${startMonth}-${startDay}`);
    this.eventStartTime.set(startDate.toTimeString().slice(0, 5));
    
    if (event.endDateTime) {
      const endDate = new Date(event.endDateTime);
      // Format date in local timezone to avoid timezone shift
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      this.eventEndDate.set(`${endYear}-${endMonth}-${endDay}`);
      this.eventEndTime.set(endDate.toTimeString().slice(0, 5));
    }
    
    this.recurrenceType.set(event.recurrenceType);
    this.selectedUserGroupId.set(event.userGroupId || null);
    
    if (event.recurrenceEndDate) {
      const recEndDate = new Date(event.recurrenceEndDate);
      // Format date in local timezone to avoid timezone shift
      const recYear = recEndDate.getFullYear();
      const recMonth = String(recEndDate.getMonth() + 1).padStart(2, '0');
      const recDay = String(recEndDate.getDate()).padStart(2, '0');
      this.recurrenceEndDate.set(`${recYear}-${recMonth}-${recDay}`);
    }
    
    this.showEventDialog.set(true);
  }
  
  protected closeEventDialog(): void {
    this.showEventDialog.set(false);
    this.resetEventForm();
  }
  
  protected closeVisibilitySelector(): void {
    this.showVisibilitySelector.set(false);
  }
  
  protected handleVisibilityChanged(ruleSet: VisibilityRuleSet): void {
    this.visibilityRuleSet.set(ruleSet);
    this.showVisibilitySelector.set(false);
  }
  
  protected async saveEvent(): Promise<void> {
    this.isSavingEvent.set(true);
    this.eventError.set(null);
    
    try {
      const startDateTime = `${this.eventStartDate()}T${this.eventStartTime()}:00`;
      const endDateTime = this.eventEndDate() && this.eventEndTime() 
        ? `${this.eventEndDate()}T${this.eventEndTime()}:00`
        : undefined;
      
      const recurrencePattern = this.buildRecurrencePattern();
      
      const selectedEvent = this.selectedEvent();
      if (selectedEvent) {
        // Update existing event - don't include teamId
        const updateRequest: UpdateEventRequest = {
          name: this.eventName(),
          description: this.eventDescription() || undefined,
          location: this.eventLocation() || undefined,
          startDateTime,
          endDateTime,
          recurrenceType: this.recurrenceType(),
          recurrencePattern,
          recurrenceEndDate: this.recurrenceEndDate() || undefined,
          userGroupId: this.selectedUserGroupId() || undefined
        };
        await this.calendarService.updateEvent(this.teamId(), selectedEvent.id, updateRequest);
      } else {
        // Create new event - include teamId
        const createRequest: CreateEventRequest = {
          teamId: this.teamId(),
          name: this.eventName(),
          description: this.eventDescription() || undefined,
          location: this.eventLocation() || undefined,
          startDateTime,
          endDateTime,
          recurrenceType: this.recurrenceType(),
          recurrencePattern,
          recurrenceEndDate: this.recurrenceEndDate() || undefined,
          userGroupId: this.selectedUserGroupId() || undefined
        };
        await this.calendarService.createEvent(this.teamId(), createRequest);
      }
      
      await this.loadEvents();
      this.closeEventDialog();
    } catch (error: any) {
      this.eventError.set(error.message || 'Failed to save event');
    } finally {
      this.isSavingEvent.set(false);
    }
  }
  
  protected async deleteEvent(event: TeamEvent | CalendarEventInstance): Promise<void> {
    // Determine if this is a full TeamEvent or a CalendarEventInstance
    const isInstance = 'instanceDate' in event;
    const eventData = isInstance ? this.events().find(e => e.id === event.id) : event;
    
    if (!eventData) return;

    console.log('deleteEvent called:', {
      isInstance,
      hasInstanceDate: 'instanceDate' in event,
      recurrenceType: eventData.recurrenceType,
      isNone: eventData.recurrenceType === RecurrenceType.NONE,
      eventId: eventData.id
    });

    // For recurring events, show confirmation dialog when deleting from calendar view
    if (isInstance && eventData.recurrenceType !== RecurrenceType.NONE) {
      console.log('Showing recurring event deletion dialog');
      const eventInstance = event as CalendarEventInstance;
      const result = await this.confirmRecurringEventDeletion(eventInstance);
      if (result === 'cancel') return;

      try {
        if (result === 'occurrence') {
          // Delete single occurrence
          console.log('Deleting single occurrence:', {
            eventId: eventInstance.id,
            instanceDate: eventInstance.instanceDate,
            instanceDateISO: eventInstance.instanceDate.toISOString()
          });
          await this.calendarService.deleteEvent(
            this.teamId(),
            eventInstance.id,
            eventInstance.instanceDate
          );
          // Reload events to reflect the exclusion
          await this.loadEvents();
        } else if (result === 'series') {
          // Delete entire series
          await this.calendarService.deleteEvent(
            this.teamId(),
            eventInstance.id
          );
          // Remove event from local state
          this.events.set(this.events().filter(e => e.id !== eventInstance.id));
          this.closeEventDialog();
        }
      } catch (error: any) {
        console.error('Failed to delete event:', error);
        alert(error.message || 'Failed to delete event. Please try again.');
      }
    } else {
      // Non-recurring event or deleting from edit dialog - simple confirmation
      console.log('Showing simple delete confirmation');
      if (!confirm(`Are you sure you want to delete "${eventData.name}"?`)) {
        return;
      }
      
      try {
        await this.calendarService.deleteEvent(this.teamId(), eventData.id);
        this.events.set(this.events().filter(e => e.id !== eventData.id));
        this.closeEventDialog();
      } catch (error: any) {
        alert(error.message || 'Failed to delete event');
      }
    }
  }

  private confirmRecurringEventDeletion(eventInstance: CalendarEventInstance): Promise<'series' | 'occurrence' | 'cancel'> {
    return new Promise((resolve) => {
      const event = this.events().find(e => e.id === eventInstance.id);
      if (!event) {
        console.log('Event not found in events array');
        resolve('cancel');
        return;
      }

      console.log('Creating dialog for event:', event.name);
      const dialog = document.createElement('div');
      dialog.className = 'recurring-delete-dialog-overlay';
      dialog.innerHTML = `
        <div class="recurring-delete-dialog">
          <h3>Delete Recurring Event</h3>
          <p>This is a recurring event. What would you like to delete?</p>
          <div class="event-details">
            <strong>${event.name}</strong>
            <div class="occurrence-date">${eventInstance.instanceDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</div>
          </div>
          <div class="dialog-actions">
            <button class="dialog-button cancel-button">Cancel</button>
            <button class="dialog-button occurrence-button">This Event Only</button>
            <button class="dialog-button series-button danger-button">All Events in Series</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);
      console.log('Dialog appended to body, checking visibility...');
      console.log('Dialog element:', dialog);
      console.log('Dialog computed style:', window.getComputedStyle(dialog).display);

      const cleanup = () => {
        console.log('Cleaning up dialog');
        dialog.remove();
      };

      dialog.querySelector('.cancel-button')?.addEventListener('click', () => {
        console.log('Cancel clicked');
        cleanup();
        resolve('cancel');
      });

      dialog.querySelector('.occurrence-button')?.addEventListener('click', () => {
        console.log('Occurrence clicked');
        cleanup();
        resolve('occurrence');
      });

      dialog.querySelector('.series-button')?.addEventListener('click', () => {
        console.log('Series clicked');
        cleanup();
        resolve('series');
      });

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          console.log('Overlay clicked');
          cleanup();
          resolve('cancel');
        }
      });
    });
  }
  
  protected toggleWeekDay(index: number): void {
    const days = this.weeklyDays();
    days[index] = !days[index];
    this.weeklyDays.set([...days]);
  }
  
  private resetEventForm(): void {
    this.eventName.set('');
    this.eventDescription.set('');
    this.eventLocation.set('');
    this.eventStartDate.set('');
    this.eventStartTime.set('');
    this.eventEndDate.set('');
    this.eventEndTime.set('');
    this.recurrenceType.set(RecurrenceType.NONE);
    this.selectedUserGroupId.set(null);
    this.dailyInterval.set(1);
    this.weeklyDays.set([false, false, false, false, false, false, false]);
    this.monthlyDays.set([]);
    this.monthlyPattern.set('');
    this.recurrenceEndDate.set('');
    this.eventError.set(null);
  }
  
  private buildRecurrencePattern(): RecurrencePattern | undefined {
    const type = this.recurrenceType();
    
    if (type === RecurrenceType.NONE) {
      return undefined;
    }
    
    if (type === RecurrenceType.DAILY) {
      return { interval: this.dailyInterval() };
    }
    
    if (type === RecurrenceType.WEEKLY) {
      const daysOfWeek = this.weeklyDays()
        .map((selected, index) => selected ? index : -1)
        .filter(day => day !== -1);
      return { daysOfWeek };
    }
    
    if (type === RecurrenceType.MONTHLY) {
      if (this.monthlyPattern()) {
        return { pattern: this.monthlyPattern() };
      }
      return { daysOfMonth: this.monthlyDays() };
    }
    
    return undefined;
  }
  
  private getEventsForDate(date: Date): CalendarEventInstance[] {
    const allEvents = this.events();
    const allAttendance = this.attendance();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const eventsForDate: CalendarEventInstance[] = [];
    
    for (const event of allEvents) {
      if (this.eventOccursOnDate(event, targetDate)) {
        // Find attendance for this event instance
        const attendanceRecord = allAttendance.find(
          a => a.eventId === event.id && 
               new Date(a.instanceDate).getTime() === targetDate.getTime()
        );
        
        eventsForDate.push({
          ...event,
          instanceDate: targetDate,
          attendance: attendanceRecord?.attendance
        });
      }
    }
    
    return eventsForDate;
  }
  
  private getEventsForWeek(date: Date): CalendarEventInstance[] {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const eventsForWeek: CalendarEventInstance[] = [];
    
    // Check each day in the week
    for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
      const dayDate = new Date(d);
      dayDate.setHours(0, 0, 0, 0);
      
      const dayEvents = this.getEventsForDate(dayDate);
      for (const eventInstance of dayEvents) {
        // Avoid duplicates by checking if we already have this event+instance combination
        if (!eventsForWeek.find(e => e.id === eventInstance.id && 
            e.instanceDate.getTime() === eventInstance.instanceDate.getTime())) {
          eventsForWeek.push(eventInstance);
        }
      }
    }
    
    return eventsForWeek;
  }
  
  private getEventsForMonth(date: Date): CalendarEventInstance[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const eventsForMonth: CalendarEventInstance[] = [];
    
    // Check each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      
      const dayEvents = this.getEventsForDate(dayDate);
      for (const eventInstance of dayEvents) {
        // Avoid duplicates by checking if we already have this event+instance combination
        if (!eventsForMonth.find(e => e.id === eventInstance.id && 
            e.instanceDate.getTime() === eventInstance.instanceDate.getTime())) {
          eventsForMonth.push(eventInstance);
        }
      }
    }
    
    return eventsForMonth;
  }
  
  private getEventsForYear(date: Date): CalendarEventInstance[] {
    const year = date.getFullYear();
    
    const eventsForYear: CalendarEventInstance[] = [];
    
    // Check each month in the year
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        
        const dayEvents = this.getEventsForDate(dayDate);
        for (const eventInstance of dayEvents) {
          // Avoid duplicates by checking if we already have this event+instance combination
          if (!eventsForYear.find(e => e.id === eventInstance.id && 
              e.instanceDate.getTime() === eventInstance.instanceDate.getTime())) {
            eventsForYear.push(eventInstance);
          }
        }
      }
    }
    
    return eventsForYear;
  }
  
  private eventOccursOnDate(event: TeamEvent, targetDate: Date): boolean {
    const eventStartDate = new Date(event.startDateTime);
    eventStartDate.setUTCHours(0, 0, 0, 0);
    
    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setUTCHours(0, 0, 0, 0);
    
    // Check if this date is excluded
    if (event.excludedDates && event.excludedDates.length > 0) {
      const isExcluded = event.excludedDates.some(excludedDate => {
        const excluded = new Date(excludedDate);
        excluded.setUTCHours(0, 0, 0, 0);
        return excluded.getTime() === targetDateOnly.getTime();
      });
      if (isExcluded) {
        return false;
      }
    }
    
    // Check if target date is before event start date
    if (targetDateOnly < eventStartDate) {
      return false;
    }
    
    // Check if event has ended (for recurring events)
    if (event.recurrenceEndDate) {
      const recEndDate = new Date(event.recurrenceEndDate);
      recEndDate.setHours(23, 59, 59, 999);
      if (targetDateOnly > recEndDate) {
        return false;
      }
    }
    
    // Non-recurring events - check if it's the exact same date
    if (event.recurrenceType === RecurrenceType.NONE) {
      return eventStartDate.getTime() === targetDateOnly.getTime();
    }
    
    // Recurring events
    const pattern = event.recurrencePattern;
    
    if (event.recurrenceType === RecurrenceType.DAILY) {
      const interval = pattern?.interval || 1;
      const daysDiff = Math.floor((targetDateOnly.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % interval === 0;
    }
    
    if (event.recurrenceType === RecurrenceType.WEEKLY) {
      // If no pattern or no daysOfWeek, default to the day the event was created
      if (!pattern || !pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
        const eventDay = eventStartDate.getDay();
        const targetDay = targetDateOnly.getDay();
        return eventDay === targetDay;
      }
      
      const daysOfWeek = pattern.daysOfWeek;
      const targetDay = targetDateOnly.getDay();
      return daysOfWeek.includes(targetDay);
    }
    
    if (event.recurrenceType === RecurrenceType.MONTHLY) {
      const targetDay = targetDateOnly.getDate();
      
      // Monthly by specific days of month (e.g., 1st, 15th, 30th)
      if (pattern?.daysOfMonth && pattern.daysOfMonth.length > 0) {
        return pattern.daysOfMonth.includes(targetDay);
      }
      
      // Monthly by pattern (e.g., "first-monday", "last-friday")
      if (pattern?.pattern) {
        return this.matchesMonthlyPattern(targetDateOnly, pattern.pattern);
      }
    }
    
    return false;
  }
  
  private matchesMonthlyPattern(date: Date, pattern: string): boolean {
    const parts = pattern.split('-');
    if (parts.length !== 2) return false;
    
    const [position, dayName] = parts;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayOfWeek = dayNames.indexOf(dayName.toLowerCase());
    
    if (targetDayOfWeek === -1 || date.getDay() !== targetDayOfWeek) {
      return false;
    }
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (position === 'first') {
      // First occurrence of this day in the month
      const firstOfMonth = new Date(year, month, 1);
      let firstOccurrence = 1;
      while (new Date(year, month, firstOccurrence).getDay() !== targetDayOfWeek) {
        firstOccurrence++;
      }
      return date.getDate() === firstOccurrence;
    }
    
    if (position === 'second') {
      const firstOfMonth = new Date(year, month, 1);
      let firstOccurrence = 1;
      while (new Date(year, month, firstOccurrence).getDay() !== targetDayOfWeek) {
        firstOccurrence++;
      }
      return date.getDate() === firstOccurrence + 7;
    }
    
    if (position === 'third') {
      const firstOfMonth = new Date(year, month, 1);
      let firstOccurrence = 1;
      while (new Date(year, month, firstOccurrence).getDay() !== targetDayOfWeek) {
        firstOccurrence++;
      }
      return date.getDate() === firstOccurrence + 14;
    }
    
    if (position === 'fourth') {
      const firstOfMonth = new Date(year, month, 1);
      let firstOccurrence = 1;
      while (new Date(year, month, firstOccurrence).getDay() !== targetDayOfWeek) {
        firstOccurrence++;
      }
      return date.getDate() === firstOccurrence + 21;
    }
    
    if (position === 'last') {
      // Last occurrence of this day in the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let lastOccurrence = daysInMonth;
      while (new Date(year, month, lastOccurrence).getDay() !== targetDayOfWeek) {
        lastOccurrence--;
      }
      return date.getDate() === lastOccurrence;
    }
    
    return false;
  }

  protected async updateAttendance(
    eventInstance: CalendarEventInstance,
    newStatus: AttendanceStatus
  ): Promise<void> {
    try {
      await this.calendarService.updateAttendance(
        this.teamId(),
        eventInstance.id,
        eventInstance.instanceDate,
        newStatus
      );

      // Update local state
      const allAttendance = this.attendance();
      const existingIndex = allAttendance.findIndex(
        a => a.eventId === eventInstance.id &&
             new Date(a.instanceDate).getTime() === eventInstance.instanceDate.getTime()
      );

      if (existingIndex >= 0) {
        allAttendance[existingIndex].attendance = newStatus;
      } else {
        allAttendance.push({
          id: crypto.randomUUID(),
          eventId: eventInstance.id,
          userId: this.authService.currentUser()!.id,
          instanceDate: eventInstance.instanceDate,
          attendance: newStatus,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      this.attendance.set([...allAttendance]);
    } catch (error) {
      console.error('Failed to update attendance:', error);
    }
  }

  protected async cycleAttendance(eventInstance: CalendarEventInstance): Promise<void> {
    const currentStatus = eventInstance.attendance;
    const newStatus = this.calendarService.cycleAttendance(currentStatus);
    await this.updateAttendance(eventInstance, newStatus);
  }

  protected readonly AttendanceStatus = AttendanceStatus;
}
