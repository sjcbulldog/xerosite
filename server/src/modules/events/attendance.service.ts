import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventAttendance, AttendanceStatus } from './entities/event-attendance.entity';
import { TeamEvent } from './entities/team-event.entity';
import { UpdateAttendanceDto, AttendanceResponseDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(EventAttendance)
    private readonly attendanceRepository: Repository<EventAttendance>,
    @InjectRepository(TeamEvent)
    private readonly eventRepository: Repository<TeamEvent>,
  ) {}

  /**
   * Get or create attendance record for a user and event instance
   */
  async getOrCreateAttendance(
    userId: string,
    eventId: string,
    instanceDate: Date,
  ): Promise<AttendanceResponseDto> {
    const instanceDateNormalized = new Date(instanceDate);
    instanceDateNormalized.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: {
        userId,
        eventId,
        instanceDate: instanceDateNormalized,
      },
    });

    if (!attendance) {
      // Verify event exists
      const event = await this.eventRepository.findOne({ where: { id: eventId } });
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      attendance = this.attendanceRepository.create({
        userId,
        eventId,
        instanceDate: instanceDateNormalized,
        attendance: AttendanceStatus.NOT_SURE,
      });

      attendance = await this.attendanceRepository.save(attendance);
    }

    return this.transformToResponse(attendance);
  }

  /**
   * Update attendance for a user and event instance
   */
  async updateAttendance(
    userId: string,
    updateDto: UpdateAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    const instanceDate = new Date(updateDto.instanceDate);
    instanceDate.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: {
        userId,
        eventId: updateDto.eventId,
        instanceDate,
      },
    });

    if (!attendance) {
      // Verify event exists
      const event = await this.eventRepository.findOne({
        where: { id: updateDto.eventId },
      });
      if (!event) {
        throw new NotFoundException(`Event with ID ${updateDto.eventId} not found`);
      }

      attendance = this.attendanceRepository.create({
        userId,
        eventId: updateDto.eventId,
        instanceDate,
        attendance: updateDto.attendance,
      });
    } else {
      attendance.attendance = updateDto.attendance;
    }

    const savedAttendance = await this.attendanceRepository.save(attendance);
    return this.transformToResponse(savedAttendance);
  }

  /**
   * Get attendance records for multiple events for a user
   */
  async getUserAttendanceForEvents(
    userId: string,
    eventIds: string[],
  ): Promise<AttendanceResponseDto[]> {
    if (eventIds.length === 0) {
      return [];
    }

    const attendances = await this.attendanceRepository.find({
      where: {
        userId,
        eventId: In(eventIds),
      },
    });

    return attendances.map((attendance) => this.transformToResponse(attendance));
  }

  /**
   * Get attendance records for a user within a date range
   */
  async getUserAttendanceForDateRange(
    userId: string,
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceResponseDto[]> {
    const attendances = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.event', 'event')
      .where('attendance.userId = :userId', { userId })
      .andWhere('event.teamId = :teamId', { teamId })
      .andWhere('attendance.instanceDate >= :startDate', { startDate })
      .andWhere('attendance.instanceDate <= :endDate', { endDate })
      .getMany();

    return attendances.map((attendance) => this.transformToResponse(attendance));
  }

  /**
   * Cycle to next attendance status
   */
  cycleAttendanceStatus(currentStatus: AttendanceStatus): AttendanceStatus {
    switch (currentStatus) {
      case AttendanceStatus.YES:
        return AttendanceStatus.NOT_SURE;
      case AttendanceStatus.NOT_SURE:
        return AttendanceStatus.NO;
      case AttendanceStatus.NO:
        return AttendanceStatus.YES;
      default:
        return AttendanceStatus.NOT_SURE;
    }
  }

  private transformToResponse(attendance: EventAttendance): AttendanceResponseDto {
    return {
      id: attendance.id,
      eventId: attendance.eventId,
      userId: attendance.userId,
      instanceDate: attendance.instanceDate,
      attendance: attendance.attendance,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    };
  }
}
