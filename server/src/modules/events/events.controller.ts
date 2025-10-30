import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AttendanceService } from './attendance.service';
import { CreateEventDto, UpdateEventDto, EventResponseDto } from './dto/event.dto';
import { UpdateAttendanceDto, AttendanceResponseDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('teams/:teamId/events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly attendanceService: AttendanceService,
  ) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: any,
  ): Promise<EventResponseDto> {
    createEventDto.teamId = teamId;
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<EventResponseDto[]> {
    if (startDate && endDate) {
      return this.eventsService.findByDateRange(teamId, new Date(startDate), new Date(endDate));
    }
    return this.eventsService.findAllForTeam(teamId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EventResponseDto> {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.eventsService.remove(id);
  }

  // Attendance endpoints
  @Get('attendance/range')
  async getUserAttendanceForRange(
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.getUserAttendanceForDateRange(
      user.id,
      teamId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Patch(':id/attendance')
  async updateAttendance(
    @Param('id') eventId: string,
    @Body() updateDto: UpdateAttendanceDto,
    @CurrentUser() user: any,
  ): Promise<AttendanceResponseDto> {
    updateDto.eventId = eventId;
    return this.attendanceService.updateAttendance(user.id, updateDto);
  }

  @Get(':id/attendance/:instanceDate')
  async getEventInstanceAttendance(
    @Param('id') eventId: string,
    @Param('instanceDate') instanceDate: string,
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.getEventInstanceAttendance(eventId, new Date(instanceDate));
  }
}
