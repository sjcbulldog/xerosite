import { IsEnum, IsNotEmpty, IsUUID, IsDateString } from 'class-validator';
import { AttendanceStatus } from '../entities/event-attendance.entity';

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsUUID()
  eventId: string;

  @IsNotEmpty()
  @IsDateString()
  instanceDate: string;

  @IsNotEmpty()
  @IsEnum(AttendanceStatus)
  attendance: AttendanceStatus;
}

export class AttendanceResponseDto {
  id: string;
  eventId: string;
  userId: string;
  instanceDate: Date;
  attendance: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class GetAttendanceDto {
  @IsNotEmpty()
  @IsUUID()
  eventId: string;

  @IsNotEmpty()
  @IsDateString()
  instanceDate: string;
}
