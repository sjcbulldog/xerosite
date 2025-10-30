export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum AttendanceStatus {
  YES = 'yes',
  NO = 'no',
  NOT_SURE = 'not-sure',
}

export enum VisibilityType {
  ALL_MEMBERS = 'all_members',
  SPECIFIC_ROLES = 'specific_roles',
  SUBTEAM = 'subteam',
  SUBTEAM_LEADS = 'subteam_leads',
}

export interface RecurrencePattern {
  // For daily recurrence
  interval?: number;
  
  // For weekly recurrence
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  
  // For monthly recurrence
  daysOfMonth?: number[]; // 1-31
  pattern?: string; // 'first-monday', 'last-friday', etc.
}

export interface VisibilityRules {
  roles?: string[];
  subteamIds?: string[];
  // New flexible visibility rules
  ruleSet?: import('./visibility-selector.types').VisibilityRuleSet;
}

export interface TeamEvent {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  location: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
  recurrenceType: RecurrenceType;
  recurrencePattern: RecurrencePattern | null;
  recurrenceEndDate: Date | null;
  userGroupId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  excludedDates?: Date[];
}

export interface EventAttendance {
  id: string;
  eventId: string;
  userId: string;
  instanceDate: Date;
  attendance: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventInstance extends TeamEvent {
  instanceDate: Date;
  attendance?: AttendanceStatus;
}

export interface CreateEventRequest {
  teamId: string;
  name: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime?: string;
  recurrenceType?: RecurrenceType;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  userGroupId?: string;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  recurrenceType?: RecurrenceType;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  userGroupId?: string;
}
