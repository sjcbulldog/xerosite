import { Component, inject, signal, computed, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from './calendar.service';
import { TeamEvent, CreateEventRequest, UpdateEventRequest, RecurrenceType, VisibilityType, RecurrencePattern, VisibilityRules } from './calendar.types';
import { AuthService } from '../auth/auth.service';
import { TeamMember } from './teams.service';
import { VisibilitySelectorComponent } from './visibility-selector.component';
import { VisibilityRuleSet } from './visibility-selector.types';
import { Subteam } from './subteam.types';

type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: TeamEvent[];
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
  protected readonly authService = inject(AuthService);
  
  readonly teamId = input.required<string>();
  readonly teamRoles = input.required<string[]>();
  readonly isAdmin = input.required<boolean>();
  readonly members = input.required<TeamMember[]>();
  readonly subteams = input.required<Subteam[]>();
  
  protected readonly currentView = signal<CalendarView>('month');
  protected readonly currentDate = signal(new Date());
  protected readonly events = signal<TeamEvent[]>([]);
  protected readonly isLoadingEvents = signal(false);
  
  // Computed permission check
  protected readonly canScheduleEvents = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;

    const member = this.members().find(m => m.userId === currentUser.id);
    if (!member) return false;

    // Check if user has SCHEDULE_EVENTS permission
    const permission = member.permissions?.find(p => p.permission === 'SCHEDULE_EVENTS');
    return permission?.enabled ?? false;
  });
  
  // Dialog signals
  protected readonly showEventDialog = signal(false);
  protected readonly selectedEvent = signal<TeamEvent | null>(null);
  protected readonly eventName = signal('');
  protected readonly eventDescription = signal('');
  protected readonly eventLocation = signal('');
  protected readonly eventStartDate = signal('');
  protected readonly eventStartTime = signal('');
  protected readonly eventEndDate = signal('');
  protected readonly eventEndTime = signal('');
  protected readonly recurrenceType = signal<RecurrenceType>(RecurrenceType.NONE);
  protected readonly visibilityType = signal<VisibilityType>(VisibilityType.ALL_MEMBERS);
  protected readonly isSavingEvent = signal(false);
  protected readonly eventError = signal<string | null>(null);
  
  // Recurrence pattern signals
  protected readonly dailyInterval = signal(1);
  protected readonly weeklyDays = signal<boolean[]>([false, false, false, false, false, false, false]); // Sun-Sat
  protected readonly monthlyDays = signal<number[]>([]);
  protected readonly monthlyPattern = signal('');
  protected readonly recurrenceEndDate = signal('');
  
  // Visibility rule signals
  protected readonly selectedRoles = signal<string[]>([]);
  protected readonly selectedSubteams = signal<string[]>([]);
  protected readonly showVisibilitySelector = signal(false);
  protected readonly visibilityRuleSet = signal<VisibilityRuleSet | null>(null);
  
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
    const allEvents = this.events();
    
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
  }
  
  protected async loadEvents(): Promise<void> {
    this.isLoadingEvents.set(true);
    try {
      const events = await this.calendarService.getEventsForTeam(this.teamId());
      this.events.set(events);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      this.isLoadingEvents.set(false);
    }
  }
  
  protected changeView(view: CalendarView): void {
    this.currentView.set(view);
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
  
  protected openCreateEventDialog(): void {
    this.resetEventForm();
    this.selectedEvent.set(null);
    this.showEventDialog.set(true);
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
    this.visibilityType.set(event.visibilityType);
    
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
  
  protected async saveEvent(): Promise<void> {
    this.isSavingEvent.set(true);
    this.eventError.set(null);
    
    try {
      const startDateTime = `${this.eventStartDate()}T${this.eventStartTime()}:00`;
      const endDateTime = this.eventEndDate() && this.eventEndTime() 
        ? `${this.eventEndDate()}T${this.eventEndTime()}:00`
        : undefined;
      
      const recurrencePattern = this.buildRecurrencePattern();
      const visibilityRules = this.buildVisibilityRules();
      
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
          visibilityType: this.visibilityType(),
          visibilityRules
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
          visibilityType: this.visibilityType(),
          visibilityRules
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
  
  protected async deleteEvent(event: TeamEvent): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) {
      return;
    }
    
    try {
      await this.calendarService.deleteEvent(this.teamId(), event.id);
      await this.loadEvents();
    } catch (error: any) {
      alert(error.message || 'Failed to delete event');
    }
  }
  
  protected toggleWeekDay(index: number): void {
    const days = this.weeklyDays();
    days[index] = !days[index];
    this.weeklyDays.set([...days]);
  }
  
  protected toggleRole(role: string): void {
    const roles = this.selectedRoles();
    const index = roles.indexOf(role);
    if (index > -1) {
      roles.splice(index, 1);
    } else {
      roles.push(role);
    }
    this.selectedRoles.set([...roles]);
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
    this.visibilityType.set(VisibilityType.ALL_MEMBERS);
    this.dailyInterval.set(1);
    this.weeklyDays.set([false, false, false, false, false, false, false]);
    this.monthlyDays.set([]);
    this.monthlyPattern.set('');
    this.recurrenceEndDate.set('');
    this.selectedRoles.set([]);
    this.selectedSubteams.set([]);
    this.visibilityRuleSet.set(null);
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
  
  private buildVisibilityRules(): VisibilityRules | undefined {
    // If we have a rule set from the visibility selector, use that
    const ruleSet = this.visibilityRuleSet();
    if (ruleSet && ruleSet.rows.length > 0) {
      return { ruleSet };
    }
    
    // Otherwise fall back to legacy visibility type
    const type = this.visibilityType();
    
    if (type === VisibilityType.ALL_MEMBERS) {
      return undefined;
    }
    
    if (type === VisibilityType.SPECIFIC_ROLES) {
      return { roles: this.selectedRoles() };
    }
    
    if (type === VisibilityType.SUBTEAM || type === VisibilityType.SUBTEAM_LEADS) {
      return { subteamIds: this.selectedSubteams() };
    }
    
    return undefined;
  }
  
  protected openVisibilitySelector(): void {
    this.showVisibilitySelector.set(true);
  }
  
  protected handleVisibilityChanged(ruleSet: VisibilityRuleSet): void {
    this.visibilityRuleSet.set(ruleSet);
    this.showVisibilitySelector.set(false);
  }
  
  protected closeVisibilitySelector(): void {
    this.showVisibilitySelector.set(false);
  }
  
  private getEventsForDate(date: Date): TeamEvent[] {
    const allEvents = this.events();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const eventsForDate: TeamEvent[] = [];
    
    for (const event of allEvents) {
      if (this.eventOccursOnDate(event, targetDate)) {
        eventsForDate.push(event);
      }
    }
    
    return eventsForDate;
  }
  
  private getEventsForWeek(date: Date): TeamEvent[] {
    const allEvents = this.events();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const eventsForWeek: TeamEvent[] = [];
    
    // Check each day in the week
    for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
      const dayDate = new Date(d);
      dayDate.setHours(0, 0, 0, 0);
      
      for (const event of allEvents) {
        if (this.eventOccursOnDate(event, dayDate) && !eventsForWeek.includes(event)) {
          eventsForWeek.push(event);
        }
      }
    }
    
    return eventsForWeek;
  }
  
  private getEventsForMonth(date: Date): TeamEvent[] {
    const allEvents = this.events();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const eventsForMonth: TeamEvent[] = [];
    
    // Check each day in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      
      for (const event of allEvents) {
        if (this.eventOccursOnDate(event, dayDate) && !eventsForMonth.includes(event)) {
          eventsForMonth.push(event);
        }
      }
    }
    
    return eventsForMonth;
  }
  
  private getEventsForYear(date: Date): TeamEvent[] {
    const allEvents = this.events();
    const year = date.getFullYear();
    
    const eventsForYear: TeamEvent[] = [];
    
    // Check each month in the year
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        
        for (const event of allEvents) {
          if (this.eventOccursOnDate(event, dayDate) && !eventsForYear.includes(event)) {
            eventsForYear.push(event);
          }
        }
      }
    }
    
    return eventsForYear;
  }
  
  private eventOccursOnDate(event: TeamEvent, targetDate: Date): boolean {
    const eventStartDate = new Date(event.startDateTime);
    eventStartDate.setHours(0, 0, 0, 0);
    
    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setHours(0, 0, 0, 0);
    
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
}
