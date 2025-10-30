import { Component, inject, signal, computed, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarService } from './calendar.service';
import { TeamsService, TeamMember } from './teams.service';
import { TeamEvent, CalendarEventInstance, AttendanceStatus } from './calendar.types';

interface EventAttendanceData {
  eventId: string;
  eventName: string;
  eventDate: Date;
  eventLocation?: string;
  eventDescription?: string;
  memberAttendance: Array<{
    member: TeamMember;
    attendance: AttendanceStatus;
  }>;
}

interface AttendanceSummary {
  totalMembers: number;
  attendingCount: number;
  notAttendingCount: number;
  notSureCount: number;
  roleBreakdown: Array<{
    role: string;
    totalMembers: number;
    attendingCount: number;
    notAttendingCount: number;
    notSureCount: number;
    members: Array<{
      member: TeamMember;
      attendance: AttendanceStatus;
    }>;
  }>;
}

@Component({
  selector: 'app-event-attendance-report',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="attendance-report">
      <div class="report-header">
        <h3>Event Attendance Report</h3>
        
        <!-- Event Selector -->
        <div class="event-selector">
          <label for="eventSelect">Select Event:</label>
          <select 
            id="eventSelect" 
            [(ngModel)]="selectedEventId" 
            (ngModelChange)="onEventSelected($event)"
            class="event-dropdown">
            <option value="">Choose an event...</option>
            @for (event of availableEvents(); track event.id + event.instanceDate.getTime()) {
              <option [value]="event.id + '_' + event.instanceDate.getTime()">
                {{ event.name }} - {{ event.instanceDate | date:'MMM d, y' }}
                @if (event.location) {
                  ({{ event.location }})
                }
              </option>
            }
          </select>
        </div>
      </div>

      @if (isLoadingReport()) {
        <div class="loading-state">
          <p>Loading attendance report...</p>
        </div>
      }

      @if (!isLoadingReport() && selectedEventData()) {
        <div class="report-content">
          <!-- Event Details -->
          <div class="event-details-card">
            <h4>{{ selectedEventData()!.eventName }}</h4>
            <div class="event-info">
              <div class="event-info-item">
                <strong>Date:</strong> {{ selectedEventData()!.eventDate | date:'MMM d, y' }}
              </div>
              @if (selectedEventData()!.eventLocation) {
                <div class="event-info-item">
                  <strong>Location:</strong> {{ selectedEventData()!.eventLocation }}
                </div>
              }
              @if (selectedEventData()!.eventDescription) {
                <div class="event-info-item">
                  <strong>Description:</strong> {{ selectedEventData()!.eventDescription }}
                </div>
              }
            </div>
          </div>

          <!-- Summary Statistics -->
          <div class="summary-card">
            <h4>Attendance Summary</h4>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Total Members:</span>
                <span class="stat-value">{{ attendanceSummary()?.totalMembers || 0 }}</span>
              </div>
              <div class="stat-item attending">
                <span class="stat-label">Attending:</span>
                <span class="stat-value">{{ attendanceSummary()?.attendingCount || 0 }}</span>
              </div>
              <div class="stat-item not-attending">
                <span class="stat-label">Not Attending:</span>
                <span class="stat-value">{{ attendanceSummary()?.notAttendingCount || 0 }}</span>
              </div>
              <div class="stat-item not-sure">
                <span class="stat-label">Not Sure:</span>
                <span class="stat-value">{{ attendanceSummary()?.notSureCount || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Role-based Breakdown -->
          @if (attendanceSummary()?.roleBreakdown; as roleBreakdown) {
            <div class="role-breakdown">
              <h4>Attendance by Role</h4>
              
              @for (roleData of roleBreakdown; track roleData.role) {
                <div class="role-section">
                  <button 
                    class="role-header" 
                    (click)="toggleRoleSection(roleData.role)"
                    [class.expanded]="expandedRoles().has(roleData.role)">
                    <span class="chevron">{{ expandedRoles().has(roleData.role) ? '▼' : '▶' }}</span>
                    <span class="role-name">{{ roleData.role }}</span>
                    <span class="role-summary">
                      ({{ roleData.attendingCount }}/{{ roleData.totalMembers }} attending)
                    </span>
                  </button>
                  
                  @if (expandedRoles().has(roleData.role)) {
                    <div class="role-content">
                      <div class="role-stats">
                        <div class="role-stat attending">
                          <span class="stat-icon">✓</span>
                          <span>{{ roleData.attendingCount }} Attending</span>
                        </div>
                        <div class="role-stat not-attending">
                          <span class="stat-icon">✗</span>
                          <span>{{ roleData.notAttendingCount }} Not Attending</span>
                        </div>
                        <div class="role-stat not-sure">
                          <span class="stat-icon">?</span>
                          <span>{{ roleData.notSureCount }} Not Sure</span>
                        </div>
                      </div>
                      
                      <div class="members-list">
                        @for (memberData of roleData.members; track memberData.member.userId) {
                          <div class="member-item">
                            <span class="member-name">
                              {{ memberData.member.user?.fullName || memberData.member.user?.firstName + ' ' + memberData.member.user?.lastName }}
                            </span>
                            <span 
                              class="attendance-status"
                              [class.attending]="memberData.attendance === AttendanceStatus.YES"
                              [class.not-attending]="memberData.attendance === AttendanceStatus.NO"
                              [class.not-sure]="memberData.attendance === AttendanceStatus.NOT_SURE">
                              @switch (memberData.attendance) {
                                @case (AttendanceStatus.YES) {
                                  <span class="status-icon">✓</span>
                                  <span>Attending</span>
                                }
                                @case (AttendanceStatus.NO) {
                                  <span class="status-icon">✗</span>
                                  <span>Not Attending</span>
                                }
                                @default {
                                  <span class="status-icon">?</span>
                                  <span>Not Sure</span>
                                }
                              }
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      @if (!isLoadingReport() && !selectedEventData() && selectedEventId()) {
        <div class="no-data-message">
          <p>No attendance data available for the selected event.</p>
        </div>
      }

      @if (!isLoadingReport() && !selectedEventId()) {
        <div class="placeholder-message">
          <p>Select an event to view the attendance report.</p>
        </div>
      }
    </div>
  `,
  styleUrl: './event-attendance-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventAttendanceReportComponent implements OnInit {
  private readonly calendarService = inject(CalendarService);
  private readonly teamsService = inject(TeamsService);

  readonly teamId = input.required<string>();
  readonly teamMembers = input.required<TeamMember[]>();
  readonly teamRoles = input.required<string[]>();
  readonly events = input.required<TeamEvent[]>();

  protected readonly selectedEventId = signal<string>('');
  protected readonly isLoadingReport = signal(false);
  protected readonly selectedEventData = signal<EventAttendanceData | null>(null);
  protected readonly expandedRoles = signal<Set<string>>(new Set());

  // Computed properties
  protected readonly availableEvents = computed(() => {
    const allEvents = this.events();
    const eventInstances: CalendarEventInstance[] = [];
    const now = new Date();
    
    // Generate instances for all events (including recurring ones) for the next year
    const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    for (const event of allEvents) {
      const instances = this.generateEventInstances(event, now, endDate);
      eventInstances.push(...instances);
    }
    
    // Sort by date (most recent first, but include past events)
    return eventInstances.sort((a, b) => b.instanceDate.getTime() - a.instanceDate.getTime());
  });

  protected readonly attendanceSummary = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return null;

    const summary: AttendanceSummary = {
      totalMembers: eventData.memberAttendance.length,
      attendingCount: 0,
      notAttendingCount: 0,
      notSureCount: 0,
      roleBreakdown: []
    };

    // Count overall attendance
    for (const memberData of eventData.memberAttendance) {
      switch (memberData.attendance) {
        case AttendanceStatus.YES:
          summary.attendingCount++;
          break;
        case AttendanceStatus.NO:
          summary.notAttendingCount++;
          break;
        default:
          summary.notSureCount++;
          break;
      }
    }

    // Group by roles
    const roleMap = new Map<string, Array<{ member: TeamMember; attendance: AttendanceStatus }>>();

    for (const memberData of eventData.memberAttendance) {
      const roles = memberData.member.roles.length > 0 ? memberData.member.roles : ['No Role'];
      
      for (const role of roles) {
        if (!roleMap.has(role)) {
          roleMap.set(role, []);
        }
        roleMap.get(role)!.push(memberData);
      }
    }

    // Build role breakdown
    for (const [role, members] of roleMap.entries()) {
      const roleData = {
        role,
        totalMembers: members.length,
        attendingCount: 0,
        notAttendingCount: 0,
        notSureCount: 0,
        members: members.sort((a, b) => 
          (a.member.user?.fullName || a.member.user?.firstName || '').localeCompare(
            b.member.user?.fullName || b.member.user?.firstName || ''
          )
        )
      };

      for (const memberData of members) {
        switch (memberData.attendance) {
          case AttendanceStatus.YES:
            roleData.attendingCount++;
            break;
          case AttendanceStatus.NO:
            roleData.notAttendingCount++;
            break;
          default:
            roleData.notSureCount++;
            break;
        }
      }

      summary.roleBreakdown.push(roleData);
    }

    // Sort roles alphabetically
    summary.roleBreakdown.sort((a, b) => a.role.localeCompare(b.role));

    return summary;
  });

  protected readonly AttendanceStatus = AttendanceStatus;

  async ngOnInit(): Promise<void> {
    // Component is ready, waiting for event selection
  }

  protected async onEventSelected(eventKey: string): Promise<void> {
    if (!eventKey) {
      this.selectedEventData.set(null);
      return;
    }

    this.isLoadingReport.set(true);
    
    try {
      // Parse the event key (eventId_timestamp)
      const [eventId, timestampStr] = eventKey.split('_');
      const instanceDate = new Date(parseInt(timestampStr));
      
      // Find the event
      const event = this.events().find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Get attendance data for this event instance
      const attendanceData = await this.loadEventAttendance(eventId, instanceDate);
      
      // Build the event data structure
      const eventData: EventAttendanceData = {
        eventId: event.id,
        eventName: event.name,
        eventDate: instanceDate,
        eventLocation: event.location || undefined,
        eventDescription: event.description || undefined,
        memberAttendance: this.teamMembers().map(member => {
          const attendance = attendanceData.find(a => a.userId === member.userId);
          return {
            member,
            attendance: attendance?.attendance || AttendanceStatus.NOT_SURE
          };
        })
      };

      this.selectedEventData.set(eventData);
    } catch (error) {
      console.error('Failed to load event attendance:', error);
      this.selectedEventData.set(null);
    } finally {
      this.isLoadingReport.set(false);
    }
  }

  protected toggleRoleSection(role: string): void {
    const expanded = this.expandedRoles();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(role)) {
      newExpanded.delete(role);
    } else {
      newExpanded.add(role);
    }
    
    this.expandedRoles.set(newExpanded);
  }

  private generateEventInstances(event: TeamEvent, startDate: Date, endDate: Date): CalendarEventInstance[] {
    const instances: CalendarEventInstance[] = [];
    const eventStartDate = new Date(event.startDateTime);
    eventStartDate.setHours(0, 0, 0, 0);
    
    // For non-recurring events, just add the single instance if it's in range
    if (event.recurrenceType === 'none') {
      if (eventStartDate >= new Date(startDate.getFullYear() - 1, 0, 1) && 
          eventStartDate <= endDate) {
        instances.push({
          ...event,
          instanceDate: eventStartDate
        });
      }
      return instances;
    }

    // For recurring events, generate instances based on recurrence pattern
    const checkEndDate = event.recurrenceEndDate ? 
      new Date(Math.min(new Date(event.recurrenceEndDate).getTime(), endDate.getTime())) : 
      endDate;

    const currentDate = new Date(eventStartDate);
    
    while (currentDate <= checkEndDate) {
      if (this.eventOccursOnDate(event, currentDate)) {
        instances.push({
          ...event,
          instanceDate: new Date(currentDate)
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Safety check to prevent infinite loops
      if (instances.length > 365) {
        break;
      }
    }

    return instances;
  }

  private eventOccursOnDate(event: TeamEvent, targetDate: Date): boolean {
    // Simplified version of the logic from calendar component
    const eventStartDate = new Date(event.startDateTime);
    eventStartDate.setHours(0, 0, 0, 0);
    
    const targetDateOnly = new Date(targetDate);
    targetDateOnly.setHours(0, 0, 0, 0);
    
    if (targetDateOnly < eventStartDate) {
      return false;
    }
    
    if (event.recurrenceType === 'none') {
      return eventStartDate.getTime() === targetDateOnly.getTime();
    }
    
    // Basic recurrence logic - extend as needed
    if (event.recurrenceType === 'weekly') {
      const daysDiff = Math.floor((targetDateOnly.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % 7 === 0;
    }
    
    if (event.recurrenceType === 'daily') {
      const interval = event.recurrencePattern?.interval || 1;
      const daysDiff = Math.floor((targetDateOnly.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % interval === 0;
    }
    
    return false;
  }

  private async loadEventAttendance(eventId: string, instanceDate: Date): Promise<Array<{userId: string, attendance: AttendanceStatus}>> {
    try {
      const attendanceData = await this.calendarService.getEventInstanceAttendance(
        this.teamId(),
        eventId,
        instanceDate
      );
      
      return attendanceData.map(a => ({
        userId: a.userId,
        attendance: a.attendance
      }));
    } catch (error) {
      console.error('Failed to load event attendance:', error);
      return [];
    }
  }
}