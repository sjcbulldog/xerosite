import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RecurrenceType } from '../enums/recurrence-type.enum';

export class CreateEventDto {
  @IsUUID()
  teamId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  @IsOptional()
  endDateTime?: string;

  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrenceType?: RecurrenceType;

  @IsObject()
  @IsOptional()
  recurrencePattern?: any;

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @IsUUID()
  @IsOptional()
  userGroupId?: string;
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  @IsDateString()
  @IsOptional()
  startDateTime?: string;

  @IsDateString()
  @IsOptional()
  endDateTime?: string;

  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrenceType?: RecurrenceType;

  @IsObject()
  @IsOptional()
  recurrencePattern?: any;

  @IsDateString()
  @IsOptional()
  recurrenceEndDate?: string;

  @IsUUID()
  @IsOptional()
  userGroupId?: string;
}

export class EventResponseDto {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  location: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
  recurrenceType: RecurrenceType;
  recurrencePattern: any;
  recurrenceEndDate: Date | null;
  userGroupId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  excludedDates?: Date[];
}
